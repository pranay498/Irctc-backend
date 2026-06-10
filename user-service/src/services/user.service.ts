import { prisma } from "../config/prisma";
import { redisClient } from "../config/redis";
import { config } from "../config/index";
import { ApiError } from "../utils/ApiError";

class UserService {
    async getProfile(userId: number) {
        const userCacheKey = `user:${userId}`;
        
        // 1. Check Redis cache
        const cachedUserJson = await redisClient.get(userCacheKey);
        if (cachedUserJson) {
            return JSON.parse(cachedUserJson);
        }

        // 2. Fall back to Postgres database
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!dbUser) {
            throw new ApiError(404, "User not found");
        }

        // 3. Cache the user profile in Redis
        await redisClient.set(userCacheKey, JSON.stringify(dbUser), {
            EX: config.REDIS_USER_TTL,
        });

        return dbUser;
    }
}

export const userService = new UserService();
