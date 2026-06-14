import { Kafka, logLevel } from "kafkajs";
import { config } from "./index";
import logger from "./logger";

const kafka = new Kafka({
    clientId: "search-service",
    brokers: config.KAFKA_BROKERS.split(","),
    logLevel: logLevel.ERROR,
});

export const consumer = kafka.consumer({
    groupId: "search-service-group",
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
});

export const connectKafka = async (): Promise<void> => {
    try {
        await consumer.connect();
        logger.info("🚀 Kafka Consumer connected successfully");
    } catch (error) {
        logger.error(`Failed to connect Kafka Consumer: ${error}`);
    }
};
export const disconnectKafka = async (): Promise<void> => {
    try {
        await consumer.disconnect();
        logger.info("Kafka Consumer disconnected successfully");
    } catch (error) {
        logger.error(`Failed to disconnect Kafka Consumer: ${error}`);
    }
};

process.on("SIGINT", () => {
    disconnectKafka();
    process.exit(0);
});
process.on("SIGTERM", () => {
    disconnectKafka();
    process.exit(0);
});

export { kafka };
