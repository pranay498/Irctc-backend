import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: Number(process.env.PORT) || 8006,
    KAFKA_BROKER: process.env.KAFKA_BROKER || "localhost:9092",
    KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || "notification-service",
    SMTP_HOST: process.env.SMTP_HOST || "smtp.mailtrap.io",
    SMTP_PORT: Number(process.env.SMTP_PORT) || 2525,
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || "notification-service-consumer",
} as const;
