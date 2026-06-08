import crypto from "crypto";
import otpGenerator from "otp-generator";
import { redisClient } from "../config/redis";
import { config } from "../config/index";
import { ApiError } from "./ApiError";
import logger from "../config/logger";

const HMAC_SECRET = config.HMAC_SECRET;

const RATE_MAX = parseInt(config.OTP_RATE_MAX_PER_HOUR.toString() || '5', 10);

const OTP_EXPIRY = config.OTP_EXPIRY


export function hmacFor(email:string , otp:string){
    const hmac = crypto.createHmac("sha256", HMAC_SECRET)
    hmac.update(email + ":" + otp)
    return hmac.digest("hex")
}

export async function generateAndStoreOtp(meta: {email: string; firstName?: string; lastName?: string; hassedPassword:string;}) {

    // HOW MANY OTP REQUESTS USER MADE

    const rateKey = `otp:rate:${meta.email}`;

    const sentCount = parseInt((await redisClient.get(rateKey)) || "0", 10);

    // RATE LIMIT CHECK

    if (sentCount >= RATE_MAX) {
        logger.warn(`Rate limit exceeded for OTP generation on email: ${meta.email}`);
        throw new ApiError(429,"Too many OTP requests. Try again later.");
    }

    // CLEAN UP OLD ACTIVE SESSIONS TO PREVENT DANGLING DATA
    const activeSessionKey = `otp:active-session:${meta.email}`;
    const oldSessionId = await redisClient.get(activeSessionKey);
    if (oldSessionId) {
        await redisClient.del(`otp:session:${oldSessionId}`);
        logger.info(`Cleaned up previous OTP session: ${oldSessionId} for email: ${meta.email}`);
    }

    // GENERATE OTP

    const generatedOtp = otpGenerator.generate(6, {
        digits: true,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
    });

    // SESSION ID

    const otpSessionId = crypto.randomUUID();

    const hashed = hmacFor(meta.email , generatedOtp)

    // STORE OTP DATA

    await redisClient.set(
        `otp:session:${otpSessionId}`,
        JSON.stringify({
            otp: hashed,
            attempts: 0,
            ...meta,
        }),
        { EX: OTP_EXPIRY }
    );

    // STORE ACTIVE SESSION POINTER
    await redisClient.set(activeSessionKey, otpSessionId, { EX: OTP_EXPIRY });

    // UPDATE RATE LIMIT COUNT

    if (sentCount === 0) {
        await redisClient.set(rateKey, 1, { EX: 60 * 60 });
    } else {
        await redisClient.incr(rateKey);
    }

    logger.info(`OTP stored in Redis successfully for email: ${meta.email}`);

    return {
        otp: generatedOtp,
        otpSessionId,
    };
}