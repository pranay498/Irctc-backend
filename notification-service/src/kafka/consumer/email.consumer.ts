import { kafka } from "../../config/kafka";
import logger from "../../config/logger";
import { sendEmail } from "../../services/email.service";

const consumer = kafka.consumer({ groupId: "notification-group" });

export const runEmailConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: "send-email", fromBeginning: true });
        logger.info('🚀 Kafka Email Consumer connected and subscribed to "send-email" topic');

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const messageValue = message.value?.toString();
                if (!messageValue) {
                    logger.warn("Received empty Kafka message value");
                    return;
                }

                logger.info(`Received send-email event: ${messageValue}`);

                try {
                    const parsedData = JSON.parse(messageValue);
                    const { to, subject, text, html } = parsedData;

                    if (!to || !subject || !text) {
                        logger.error("Missing required fields (to, subject, text) in email payload");
                        return;
                    }

                    await sendEmail({ to, subject, text, html });
                } catch (err: any) {
                    logger.error(`Error processing email task: ${err.message}`);
                }
            },
        });
    } catch (error) {
        logger.error(`Failed to start Kafka Email Consumer: ${error}`);
        throw error;
    }
};

export const disconnectConsumer = async (): Promise<void> => {
    try {
        await consumer.disconnect();
        logger.info("Kafka Email Consumer disconnected successfully");
    } catch (error) {
        logger.error(`Failed to disconnect Kafka Email Consumer: ${error}`);
    }
};
