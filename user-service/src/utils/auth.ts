import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";

export const generateAccessToken = (userId: number): string => {
    const payload = {
        id: userId,
    };
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
        expiresIn: config.ACCESS_TOKEN_EXP as any,
    });
};

export const generateRefreshToken = (userId: number): string => {
    const payload = {
        id: userId,
        jti: crypto.randomUUID(),
    };
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
        expiresIn: config.REFRESH_TOKEN_EXP as any,
    });
};
