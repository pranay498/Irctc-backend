import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: Number(process.env.PORT) || 4001,
    NODE_ENV: process.env.NODE_ENV || "development",
    REDIS_URL: process.env.REDIS_URL || "redis://:irctcpass@localhost:6379",
    DATABASE_URL: process.env.DATABASE_URL || "",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
    OTP_EXPIRY: Number(process.env.OTP_EXPIRY) || 600,
    OTP_RATE_MAX_PER_HOUR: Number(process.env.OTP_RATE_MAX_PER_HOUR) || 5,
    HMAC_SECRET: process.env.HMAC_SECRET || "",
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "irctc_access_secret_12345",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "irctc_refresh_secret_12345",
    ACCESS_TOKEN_EXP: process.env.ACCESS_TOKEN_EXP || "15m",
    REFRESH_TOKEN_EXP: process.env.REFRESH_TOKEN_EXP || "7d",
    REFRESH_TOKEN_EXP_SEC: Number(process.env.REFRESH_TOKEN_EXP_SEC) || 604800, // 7 days in seconds
    REDIS_USER_TTL: Number(process.env.REDIS_USER_TTL) || 86400, // 1 day in seconds
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    KAFKA_BROKERS: process.env.KAFKA_BROKERS || "localhost:9092",
} as const;


