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
    CIRCUIT_BREAKER_COOLDOWN_PERIOD:process.env.CIRCUIT_BREAKER_COOLDOWN_PERIOD || 300000,
    SERVICE_REQUEST_TIMEOUT:process.env.SERVICE_REQUEST_TIMEOUT || 15000,
    RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 mins
    SERVICES: {
        ADMIN_SERVICE_URL: process.env.ADMIN_SERVICE_URL || "http://localhost:4010",
        SEARCH_SERVICE_URL: process.env.SEARCH_SERVICE_URL || "http://localhost:4004",
        INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || "http://localhost:4012",
        BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || "http://localhost:8005",
        PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || "http://localhost:4020",
    }
} as const;

