import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { ApiError } from "../utils/ApiError";
import logger from "../config/logger";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

export const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new ApiError(401, "Authorization token required");
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new ApiError(401, "Authorization token invalid");
        }

        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as { id: number };

        if (!decoded || !decoded.id) {
            throw new ApiError(401, "Invalid token payload");
        }
        req.user = {
            id: decoded.id,
        };

        // Add user ID to headers for proxied requests
        req.headers["x-user-id"] = decoded.id.toString();

        logger.info(`User ${decoded.id} authenticated successfully`);

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new ApiError(401, "Invalid or expired access token"));
        } else {
            next(error);
        }
    }
};
