import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: Number(process.env.PORT) || 4000,
    NODE_ENV: process.env.NODE_ENV || "development",
    USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:8001",
    NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8006",
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "irctc_access_secret_12345",
    ALLOWED_ORIGINS:process.env.ALLOWEDORIGINS?.split(",") || ["http://localhost:5173","http://localhost:5174"],
    CIRCUIT_BREAKER_THRESHOLD:process.env.CIRCUIT_BREAKER_THRESHOLD || 5,
    CIRCUIT_BREAKER_FAILURE_TIMEOUT:process.env.CIRCUIT_BREAKER_FAILURE_TIMEOUT || 60000,
    CIRCUIT_BREAKER_COOLDOWN_PERIOD:process.env.CIRCUIT_BREAKER_COOLDOWN_PERIOD || 300000
} as const;
