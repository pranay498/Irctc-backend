import { Request } from "express";
import crypto from "crypto";

export const getDeviceFingerprint = (req: Request): string => {
    const userAgent = req.headers["user-agent"] || "";
    const ip = (req.ip || req.headers["x-forwarded-for"] || "unknown_ip").toString();
    const fingerprint = `${userAgent}:${ip}`;
    
    return crypto.createHash("sha256").update(fingerprint).digest("hex");
};
