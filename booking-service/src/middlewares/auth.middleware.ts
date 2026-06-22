import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { ApiError } from "../utils/ApiError";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // 1. Check if API Gateway already authenticated the user and passed the ID
        const gatewayUserId = req.headers["x-user-id"];
        if (gatewayUserId) {
            req.user = { id: Number(gatewayUserId) };
            return next();
        }

        // 2. Fall back to direct Bearer token verification if request did not go through Gateway
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new ApiError(401, "Authorization token required");
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new ApiError(401, "Authorization token invalid");
        }

        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as { id: number };
        req.user = { id: decoded.id };
        
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new ApiError(401, "Invalid or expired access token"));
        } else {
            next(error);
        }
    }
};
