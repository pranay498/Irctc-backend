import { Request, Response, NextFunction, RequestHandler } from "express";
import { redisClient } from "../config/redis";
import { config } from "../config";
import { ApiError } from "../utils/ApiError";
import logger from "../config/logger";

interface SlidingWindowOptions {
     max?: number;
     windowMs?: number;
}

interface SlidingWindowResult {
     allowed: boolean;
     remaining: number;
     resetTime: number;
     retryAfter?: number;
}

/**
 * Generic Sliding Window Rate Limiter
 * Uses Redis Sorted Set (ZSET)
 */
async function slidingWindowRateLimiter(key: string, maxRequests: number, windowMs: number): Promise<SlidingWindowResult> {
     const now = Date.now();
     const windowStart = now - windowMs;

     try {
          // Use multi() to batch commands in node-redis
          const results = await redisClient
               .multi()
               .zRemRangeByScore(key, 0, windowStart)
               .zAdd(key, { score: now, value: `${now}-${Math.random()}` })
               .zCard(key)
               .expire(key, Math.ceil(windowMs / 1000))
               .exec();

          if (!results) throw new Error("Sliding window pipeline failed.");

          // results[2] is the output of the zCard command
          const requestCount = results[2] as unknown as number;

          if (requestCount > maxRequests) {
               const oldestRequest = await redisClient.zRangeWithScores(key, 0, 0);
               const resetTime = (oldestRequest[0]?.score ?? now) + windowMs;

               return {
                    allowed: false,
                    remaining: 0,
                    resetTime,
                    retryAfter: Math.ceil((resetTime - now) / 1000)
               };
          }

          return {
               allowed: true,
               remaining: maxRequests - requestCount,
               resetTime: now + windowMs
          };

     } catch (error) {
          logger.error("Sliding Window Error:", error);

          // Fail Open
          return {
               allowed: true,
               remaining: maxRequests,
               resetTime: now + windowMs,
          };
     }
}

/**
 * Adds standard Rate Limit headers
 */
function setRateLimitHeaders(res: Response, limit: number, result: SlidingWindowResult): void {
     res.setHeader("X-RateLimit-Limit", limit);
     res.setHeader("X-RateLimit-Remaining", result.remaining);
     res.setHeader("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

     if (!result.allowed && result.retryAfter) {
          res.setHeader("Retry-After", result.retryAfter.toString());
     }
}

/**
 * IP Sliding Window Rate Limiter
 * Default: Global protection for unauthenticated users
 */
export function ipSlidingWindowRateLimit(
     options: SlidingWindowOptions = {}
): RequestHandler {
     const maxRequests = options.max ?? config.RATE_LIMIT_MAX_REQUESTS;
     const windowMs = options.windowMs ?? config.RATE_LIMIT_WINDOW_MS;

     return async (
          req: Request,
          res: Response,
          next: NextFunction
     ): Promise<void> => {
          try {
               const ip = req.ip || req.socket.remoteAddress || "unknown";
               const key = `slidingwindow:ip:${ip}`;

               const result = await slidingWindowRateLimiter(
                    key,
                    maxRequests,
                    windowMs
               );

               setRateLimitHeaders(res, maxRequests, result);

               if (!result.allowed) {
                    logger.warn(`IP Sliding Window limit exceeded: ${ip}`);

                    return next(
                         new ApiError(
                              429,
                              `Too many requests. Try again after ${result.retryAfter} seconds.`
                         )
                    );
               }

               next();
          } catch (error) {
               next(error);
          }
     };
}

/**
 * User Sliding Window Rate Limiter
 * Requires Authentication Middleware
 */
export function userSlidingWindowRateLimit(
     options: SlidingWindowOptions = {}
): RequestHandler {
     const maxRequests = options.max ?? (config.RATE_LIMIT_MAX_REQUESTS * 10);
     const windowMs = options.windowMs ?? config.RATE_LIMIT_WINDOW_MS;

     return async (
          req: Request,
          res: Response,
          next: NextFunction
     ): Promise<void> => {
          try {
               const user = (req as any).user;

               if (!user?.id) {
                    return next();
               }

               const key = `slidingwindow:user:${user.id}`;

               const result = await slidingWindowRateLimiter(key, maxRequests, windowMs);

               setRateLimitHeaders(res, maxRequests, result);

               if (!result.allowed) {
                    logger.warn(`User Sliding Window limit exceeded: ${user.id}`);

                    return next(new ApiError(429, `Too many requests. Try again after ${result.retryAfter} seconds.`));
               }

               next();
          } catch (error) {
               next(error);
          }
     };
}

/**
 * Endpoint Sliding Window Rate Limiter
 * Protects a specific endpoint
 */
export function endpointSlidingWindowRateLimit(maxRequests: number, windowMs: number): RequestHandler {
     return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
          try {
               const endpoint = `${req.method}:${req.path}`;
               const user = (req as any).user;

               let identifier: string;

               if (user?.id) {
                    identifier = `user:${user.id}`;
               } else {
                    identifier = req.ip || req.socket.remoteAddress || "unknown";
               }
               const key = `slidingwindow:endpoint:${endpoint}:${identifier}`;
               const result = await slidingWindowRateLimiter(key, maxRequests, windowMs);
               setRateLimitHeaders(res, maxRequests, result);

               if (!result.allowed) {
                    logger.warn(`Endpoint Sliding Window exceeded: ${endpoint} (${identifier})`);
                    return next(
                         new ApiError(
                              429,
                              `Too many requests to this endpoint. Try again after ${result.retryAfter} seconds.`
                         )
                    );
               }

               next();
          } catch (error) {
               next(error);
          }
     };
}