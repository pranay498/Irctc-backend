import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { ApiError } from "../utils/ApiError";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number | string;
    };
}

export const getUserContext = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const gatewayUserId = req.headers["x-user-id"];
        if (gatewayUserId) {
            req.user = { id: String(gatewayUserId) };
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new ApiError(401, "Authorization token required"));
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return next(new ApiError(401, "Authorization token invalid"));
        }

        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as { id: number | string };
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
