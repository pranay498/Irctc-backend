import { Message } from "kafkajs";
import { consumer } from "../../config/kafka";
import logger from "../../config/logger";
import {emailServices } from "../../services/email.service";
import { TOPICS } from "../../utils/constant";

class EmailConsumer {
    async start() {
        try {
            await consumer.connect();

            logger.info("Kafka Consumer connected successfully");

            await consumer.subscribe({
                topics: Object.values(TOPICS),
                fromBeginning: true,
            });

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    logger.info(`Received message from topic: ${topic}`, {
                        partition,
                        offset: message.offset,
                        key: message.key?.toString(),
                        value: message.value?.toString(),
                    });

                    await this.handleMessage(topic, message);
                },
            });
        } catch (error) {
            logger.error(`Error in EmailConsumer: ${error}`);
        }
    }

    async handleMessage(topic: string, message: Message) {
        switch (topic) {
            case TOPICS.OTP_EMAIL:
                await this.handleOtpEmail(message);
                break;

            case TOPICS.WELCOME_EMAIL:
                await this.handleWelcomeEmail(message);
                break;

            default:
                logger.warn(`Unknown topic: ${topic}`);
        }
    }

    async handleOtpEmail(message: Message) {
        const payload = JSON.parse(message.value?.toString()!)

        const { email, otp, ttl } = payload

        if(!email || !otp) {
            logger.error("Invalid payload for OTP email", );
            return
        }
        await emailServices.sendOtpEmail({email,otp:Number(otp),ttlMinutes:Number(ttl) || 5})
        logger.info(`OTP email sent to ${email}`)
        
        
    }

    async handleWelcomeEmail(message: Message) {
        try {
            const payload = JSON.parse(message.value?.toString()!);
            const { email, firstName } = payload;

            if (!email || !firstName) {
                logger.error("Invalid payload for Welcome email");
                return;
            }

            await emailServices.sendWelcomeEmail({ email, firstName });
            logger.info(`Welcome email sent to ${email}`);
        } catch (error) {
            logger.error(`Error handling welcome email message: ${error}`);
        }
    }
}

export const emailConsumer = new EmailConsumer();