import { getProducer } from "../../config/kafka";
import logger from "../../config/logger";
import { TOPICS } from "../../utils/constants";

class NotificationProducer {
    private isInitialized = false;

    async initialize(): Promise<void> {
        // connectKafka is called on server boot in index.ts, so we just set initialized to true
        this.isInitialized = true;
    }

    async sendEmailNotification(payload: { to: string; subject: string; text: string; html?: string }): Promise<void> {
        try {
            await this.initialize();
            const producer = getProducer();

            await producer.send({
                topic: TOPICS.EMAIL_NOTIFICATION,
                messages: [
                    {
                        value: JSON.stringify(payload),
                        timestamp: Date.now().toString(),
                    },
                ],
            });
            logger.info(`Published email notification event to ${TOPICS.EMAIL_NOTIFICATION} for ${payload.to}`,
            );
        } catch (error) {
            logger.error(`Error sending notification event via Kafka: ${error}`);
            throw error;
        }
    }
}

export const notificationProducer = new NotificationProducer();
export default notificationProducer;
