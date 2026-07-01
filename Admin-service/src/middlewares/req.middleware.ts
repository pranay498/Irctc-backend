import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../config/logger";

export interface CustomRequest extends Request {
    id?: string;
    startTime?: number;
}

export const requestLogger = (req: CustomRequest, res: Response, next: NextFunction) => {
    
    req.id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    

    req.startTime = Date.now();

    // 3. Log incoming request details
    logger.info(`[REQ] ID: ${req.id} | Method: ${req.method} | Path: ${req.path} | IP: ${req.ip}`);

    // 4. Capture the response finish event to calculate request duration
    res.on("finish", () => {
        const duration = Date.now() - (req.startTime || Date.now());
        logger.info(
            `[RES] ID: ${req.id} | Method: ${req.method} | Path: ${req.path} | Status: ${res.statusCode} | Duration: ${duration}ms`
        );
    });

    next();
};

export default requestLogger;
