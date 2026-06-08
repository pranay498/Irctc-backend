import { Kafka, logLevel } from "kafkajs";
import { config } from "./index";
import logger from "./logger";

const kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID,
    brokers: [config.KAFKA_BROKER],
    logLevel: logLevel.ERROR,
    retry: {
        initialRetryTime: 300,
        retries: 10,
        maxRetryTime: 30000,
        multiplier: 2,
    },
});

export const consumer = kafka.consumer({
  groupId: config.KAFKA_GROUP_ID,
  sessionTimeout:30000,
  heartbeatInterval:3000,

 });

 const shutDown = async () =>{
    try{
        await consumer.disconnect();
        logger.info("Kafka Consumer disconnected successfully");
    } catch (error) {
        logger.error(`Failed to disconnect Kafka Consumer: ${error}`);
    }
 };

 process.on("SIGINT", shutDown);
 process.on("SIGTERM", shutDown);

 export { kafka };
