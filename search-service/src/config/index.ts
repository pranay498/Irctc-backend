import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: Number(process.env.PORT) || 4004,
    NODE_ENV: process.env.NODE_ENV || "development",
    ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
    KAFKA_BROKERS: process.env.KAFKA_BROKERS || "localhost:9092",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
    JWT_ACCESS_SECRET:process.env.JWT_ACCESS_SECRET || "secret"
} as const;
