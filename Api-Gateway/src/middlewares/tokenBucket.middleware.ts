import type { Request, Response, NextFunction, RequestHandler } from "express";
import { redisClient } from "../config/redis";
import { TokenBucketExecutor } from "../service/TokenBucket/tokenBucketExecutor";
import { BucketConfig } from "../types";
import { ApiError } from "../utils/ApiError";
import { config } from "../config";

// Create one executor for the entire application
const executor = new TokenBucketExecutor(redisClient);

// Load Lua script once when the application starts
executor.loadScript().catch((err) => {
    console.error("[TokenBucket] Failed to load Lua script:", err);
});

function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];

    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }

    return req.socket.remoteAddress ?? "unknown";
}

function buildBucketKey(method: string, routePath: string, identity: string): string {
    const cleanPath = routePath.split("?")[0].replace(/\/{2,}/g, "/");
    return `tokenbucket:${method.toUpperCase()}:${cleanPath}:${identity}`;
}

export function globalTokenBucketRateLimit(bucket?: BucketConfig): RequestHandler {

    const bucketConfig: BucketConfig = bucket ?? {
        capacity: config.RATE_LIMIT_MAX_REQUESTS,
        refillRate: config.RATE_LIMIT_MAX_REQUESTS / (config.RATE_LIMIT_WINDOW_MS / 1000), // tokens refilled per second
    };

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {

        try {
            const user = (req as any).user;

            const identity = user?.id ? `user:${user.id}` : `ip:${getClientIp(req)}`;

            const bucketKey = buildBucketKey(req.method, req.path, identity);

            const result = await executor.consume(bucketKey, bucketConfig);

            res.setHeader("X-RateLimit-Limit", bucketConfig.capacity);
            res.setHeader("X-RateLimit-Remaining", Math.floor(result.tokensRemaining));
            res.setHeader("X-RateLimit-Reset", Math.ceil((Date.now() + result.retryAfterMs) / 1000));

            if (!result.allowed) {
                const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);

                res.setHeader("Retry-After", retryAfterSec);

                return next(new ApiError(429, `Too many requests. Please try again in ${retryAfterSec} seconds.`));
            }

            next();

        } catch (err) {
            console.error("[TokenBucket] Middleware Error:", err);
            // Fail Open
            next();
        }
    };
}