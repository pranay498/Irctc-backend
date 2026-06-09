import { getProducer } from "../../config/kafka";
import logger from "../../config/logger";
import { TOPICS } from "../../utils/constants";

class NotificationProducer {
    private isInitialized = false;

    async initialize(): Promise<void> {
        this.isInitialized = true;
    }

    async sendEmailNotification(payload: { email: string, otp: Number, ttl: Number }): Promise<void> {
        try {
            await this.initialize();
            const producer = getProducer();

            await producer.send({
                topic: TOPICS.OTP_EMAIL,
                messages: [
                    {
                        key: "otp",
                        value: JSON.stringify(payload),
                        timestamp: Date.now().toString(),
                    },
                ],
            });
            logger.info(`Published email notification event to ${TOPICS.OTP_EMAIL} for ${payload.email}`);
        } catch (error) {
            logger.error(`Error sending notification event via Kafka: ${error}`);
            throw error;
        }
    }

    async sendWelcomeEmail(payload: { email: string, firstName: string }): Promise<void> {
        try {
            await this.initialize();
            const producer = getProducer();

            await producer.send({
                topic: TOPICS.WELCOME_EMAIL,
                messages: [
                    {
                        key: "welcome",
                        value: JSON.stringify(payload),
                        timestamp: Date.now().toString(),
                    },
                ],
            });
            logger.info(`Published welcome email event to ${TOPICS.WELCOME_EMAIL} for ${payload.email}`);
        } catch (error) {
            logger.error(`Error sending welcome email event via Kafka: ${error}`);
            throw error;
        }
    }
}

export const notificationProducer = new NotificationProducer();
export default notificationProducer;
