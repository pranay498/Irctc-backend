import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

const ipRequests = new Map<string, { count: number; startTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // Limit each IP to 100 requests per window

export const ipRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    
    const requestData = ipRequests.get(ip);
    if (!requestData) {
        ipRequests.set(ip, { count: 1, startTime: now });
        return next();
    }

    if (now - requestData.startTime > WINDOW_MS) {
        requestData.count = 1;
        requestData.startTime = now;
        return next();
    }

    requestData.count++;
    if (requestData.count > MAX_REQUESTS) {
        return next(new ApiError(429, "Too many requests, please try again later."));
    }

    next();
};
