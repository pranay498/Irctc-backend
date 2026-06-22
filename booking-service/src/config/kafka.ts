import { Kafka, Producer } from "kafkajs";
import { config } from "./index";
import logger from "./logger";

const kafka = new Kafka({
    clientId: "user-service",
    brokers: config.KAFKA_BROKERS.split(","),
    retry: {
        initialRetryTime: 300,
        retries: 3,
        maxRetryTime: 300000,
        
    },
});

let producer: Producer | null = null;

export const connectKafka = async (): Promise<void> => {
    try {
        producer = kafka.producer({
            allowAutoTopicCreation:true,
            idempotent:true,
            maxInFlightRequests: 5,
             retry:{
                retries:5,
             }
        });
        await producer.connect();
        logger.info("🚀 Kafka Producer connected successfully");
    } catch (error) {
        logger.error(`Failed to connect Kafka Producer: ${error}`);
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