import { Kafka, Producer, Consumer } from "kafkajs";
import { config } from "./index";
import { logger } from "./logger";

const kafka = new Kafka({
    clientId: "inventory-service",
    brokers: config.KAFKA_BROKERS.split(","),
    retry: {
        initialRetryTime: 300,
        retries: 3,
        maxRetryTime: 300000,
    },
});

let producer: Producer | null = null;

export const consumer: Consumer = kafka.consumer({
    groupId: "inventory-service-group",
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
});

export const connectKafka = async (): Promise<void> => {
    try {
        producer = kafka.producer({
            allowAutoTopicCreation: true,
            idempotent: true,
            maxInFlightRequests: 5,
            retry: {
                retries: 5,
            }
        });
        await producer.connect();
        logger.info("🚀 Kafka Producer connected successfully");

        await consumer.connect();
        logger.info("🚀 Kafka Consumer connected successfully");
    } catch (error) {
        logger.error(`Failed to connect Kafka: ${error}`);
    }
};

export const getProducer = (): Producer => {
    if (!producer) {
        throw new Error("Kafka Producer is not initialized. Call connectKafka() first.");
    }
    return producer;
};

export const disconnectKafka = async (): Promise<void> => {
    if (producer) {
        try {
            await producer.disconnect();
            logger.info("Kafka Producer disconnected successfully");
        } catch (error) {
            logger.error(`Failed to disconnect Kafka Producer: ${error}`);
        }
    }
    try {
        await consumer.disconnect();
        logger.info("Kafka Consumer disconnected successfully");
    } catch (error) {
        logger.error(`Failed to disconnect Kafka Consumer: ${error}`);
    }
};

process.on("SIGINT", async () => {
    await disconnectKafka();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await disconnectKafka();
    process.exit(0);
});

export { kafka };