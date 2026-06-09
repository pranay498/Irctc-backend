import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import bcrypt from "bcryptjs";
import { generateAndStoreOtp, hmacFor } from "../utils/otp";
import logger from "../config/logger";
import { redisClient } from "../config/redis";
import { generateAccessToken, generateRefreshToken } from "../utils/auth";
import { config } from "../config";
import { OAuth2Client } from "google-auth-library";
import notificationProducer from "../kafka/producer/notification.producer";

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export const otp = async (firstName: string, lastName: string, email: string, password: string, confirmPassword: string) => {

    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if (existingUser) {
        throw new ApiError(409,"User already exists");
    }

    const hassedPassword = await bcrypt.hash(password,10);

    const meta = {firstName,lastName,hassedPassword,email}

    const {otp ,otpSessionId} = await generateAndStoreOtp(meta)

    logger.info(`Sending OTP: ${otp} to email: ${email}`);

    await notificationProducer.sendEmailNotification({
        email,
        otp: Number(otp),
        ttl: Math.floor(config.OTP_EXPIRY / 60)
    });

    return {otpSessionId} 
    
}

export const verifyOtp = async (otp: string, otpSessionId: string) => {
    const redisKey = `otp:session:${otpSessionId}`;

    const sessionDataJson = await redisClient.get(redisKey);
    if (!sessionDataJson) {
        throw new ApiError(400, "OTP expired or invalid session");
    }

    const sessionData = JSON.parse(sessionDataJson);


    sessionData.attempts = (sessionData.attempts || 0) + 1;

    const activeSessionKey = `otp:active-session:${sessionData.email}`;

    if (sessionData.attempts > 5) {
        await redisClient.del(redisKey);
        await redisClient.del(activeSessionKey);
        throw new ApiError(400, "Too many failed attempts. This OTP has been invalidated.");
    }

    // 3. Validate OTP code
    const hashedOtp = hmacFor(sessionData.email, otp);
    const buf1 = Buffer.from(hashedOtp, "hex");
    const buf2 = Buffer.from(sessionData.otp, "hex");
    const isOtpValid = (buf1.length === buf2.length) && crypto.timingSafeEqual(buf1, buf2);

    if (!isOtpValid) {
    
        const ttl = await redisClient.ttl(redisKey);
        if (ttl > 0) {
            await redisClient.set(redisKey, JSON.stringify(sessionData), { EX: ttl });
        }
        
        const remaining = 5 - sessionData.attempts;
        if (remaining === 0) {
            await redisClient.del(redisKey);
            await redisClient.del(activeSessionKey);
            throw new ApiError(400, "Too many failed attempts. This OTP has been invalidated.");
        }
        
        throw new ApiError(400, `Invalid OTP. ${remaining} attempts remaining.`);
    }

    // 4. Create user in Postgres database
    const user = await prisma.user.create({
        data: {
            firstName: sessionData.firstName,
            lastName: sessionData.lastName,
            email: sessionData.email,
            password: sessionData.hassedPassword,
            emailVerified: true,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
        }
    });

    // 5. Delete the OTP session from Redis
    await redisClient.del(redisKey);
    await redisClient.del(activeSessionKey);

    logger.info(`User registered successfully via OTP verification: ${sessionData.email}`);

    try {
        await notificationProducer.sendWelcomeEmail({
            email: sessionData.email,
            firstName: sessionData.firstName,
        });
    } catch (error) {
        logger.error(`Failed to send welcome email to ${sessionData.email}: ${error}`);
    }

    return user;
};

export const login = async (email: string, password: string, deviceId: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    if (!user.password) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };

    const decoded = jwt.decode(refreshToken) as { jti?: string } | null;
    const jti = decoded?.jti || "";

    // Store refresh token JTI in Redis
    const refreshKey = `refresh:${user.id}:${deviceId}`;
    await redisClient.set(refreshKey, jti, { EX: config.REFRESH_TOKEN_EXP_SEC });

    // Cache safe user in Redis
    const userCacheKey = `user:${user.id}`;
    await redisClient.set(userCacheKey, JSON.stringify(userResponse), { EX: config.REDIS_USER_TTL });

    logger.info(`User logged in successfully: ${email}`);

    return {
        user: userResponse,
        accessToken,
        refreshToken,
    };
};

export const rotateRefreshToken = async (refreshToken: string, deviceId: string) => {
    try {
        const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { id: number; jti: string };
        const userId = decoded.id;
        const jti = decoded.jti;

        const refreshKey = `refresh:${userId}:${deviceId}`;
        const storedJti = await redisClient.get(refreshKey);

        if (!storedJti || storedJti !== jti) {
            // Revoke active sessions if reuse is detected (security best practice)
            await redisClient.del(refreshKey);
            throw new ApiError(401, "Invalid refresh token or session revoked");
        }

        // Generate new access and refresh tokens
        const newAccessToken = generateAccessToken(userId);
        const newRefreshToken = generateRefreshToken(userId);

        const newDecoded = jwt.decode(newRefreshToken) as { jti?: string } | null;
        const newJti = newDecoded?.jti || "";

        // Update stored JTI in Redis
        await redisClient.set(refreshKey, newJti, { EX: config.REFRESH_TOKEN_EXP_SEC });

        // Retrieve user details (first check Redis cache, fall back to Postgres)
        const userCacheKey = `user:${userId}`;
        let cachedUserJson = await redisClient.get(userCacheKey);
        let userResponse;

        if (cachedUserJson) {
            userResponse = JSON.parse(cachedUserJson);
        } else {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new ApiError(404, "User not found");
            }
            userResponse = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
            await redisClient.set(userCacheKey, JSON.stringify(userResponse), { EX: config.REDIS_USER_TTL });
        }

        logger.info(`Refresh token rotated successfully for user ID: ${userId}`);

        return {
            user: userResponse,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    } catch (error: any) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(401, "Invalid or expired refresh token");
    }
};

export const googleLogin = async (idToken: string, deviceId: string) => {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
        throw new ApiError(400, "Google token payload is missing email");
    }

    const email = payload.email;
    const providerId = payload.sub; // Google user ID
    const firstName = payload.given_name || "Google";
    const lastName = payload.family_name || "User";

    const user = await prisma.$transaction(async (tx) => {
        let authProvider = await tx.authProvider.findUnique({
            where: {
                provider_providerId: {
                    provider: "google",
                    providerId,
                },
            },
            include: {
                user: true,
            },
        });

        let targetUser;

        if (authProvider) {
            targetUser = authProvider.user;
        } else {
            const existingUser = await tx.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                targetUser = existingUser;
                await tx.authProvider.create({
                    data: {
                        userId: existingUser.id,
                        provider: "google",
                        providerId,
                    },
                });

                if (!existingUser.emailVerified) {
                    targetUser = await tx.user.update({
                        where: { id: existingUser.id },
                        data: { emailVerified: true },
                    });
                }
            } else {
                targetUser = await tx.user.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        emailVerified: true,
                        AuthProviders: {
                            create: {
                                provider: "google",
                                providerId,
                            },
                        },
                    },
                });
            }
        }

        return targetUser;
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };

    const decoded = jwt.decode(refreshToken) as { jti?: string } | null;
    const jti = decoded?.jti || "";

    const refreshKey = `refresh:${user.id}:${deviceId}`;
    await redisClient.set(refreshKey, jti, { EX: config.REFRESH_TOKEN_EXP_SEC });

    const userCacheKey = `user:${user.id}`;
    await redisClient.set(userCacheKey, JSON.stringify(userResponse), { EX: config.REDIS_USER_TTL });

    logger.info(`User logged in successfully via Google: ${email}`);

    return {
        user: userResponse,
        accessToken,
        refreshToken,
    };
};