import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { ApiError } from "../utils/ApiError";

export const internalAuth = (req: Request, res: Response, next: NextFunction) => {
    const serviceKey = req.headers["x-internal-service-key"];
    if (!serviceKey || serviceKey !== config.INTERNAL_SERVICE_KEY) {
        throw new ApiError(403, "Forbidden: Invalid or missing internal service key");
    }
    next();
};
