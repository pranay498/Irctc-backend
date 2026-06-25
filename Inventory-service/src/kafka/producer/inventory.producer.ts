import { getProducer } from "../../config/kafka";
import { logger } from "../../config/logger";
import { TOPICS } from "../../utils/constants";

const MAX_PUBLISH_RETRIES = 3;
const RETRY_DELAY_MS = 500;

class InventoryProducer {
    private isInitialized = false;

    async initialize(): Promise<void> {
        this.isInitialized = true;
    }

    async sendMessage(topic: string, key: string, value: any): Promise<any> {
        await this.initialize();
        const producer = getProducer();

        let lastError: any;
        for (let attempt = 1; attempt <= MAX_PUBLISH_RETRIES; attempt++) {
            try {
                const result = await producer.send({
                    topic,
                    messages: [{
                        key: key || `${topic}-${Date.now()}`,
                        value: JSON.stringify(value),
                        timestamp: Date.now().toString(),
                    }],
                });
                logger.info(`Message sent to topic: ${topic}`, {
                    key,
                    partition: result[0].partition,
                    offset: result[0].offset,
                });
                return result;
            } catch (error: any) {
                lastError = error;
                logger.error(`Failed to send message to ${topic} (attempt ${attempt}/${MAX_PUBLISH_RETRIES})`, {
                    error: error.message,
                    key,
                });
                if (attempt < MAX_PUBLISH_RETRIES) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
                }
            }
        }

        logger.error(`All ${MAX_PUBLISH_RETRIES} publish attempts failed for ${topic}`, { key });
        throw lastError;
    }

    async publishSeatAvailabilityUpdated(scheduleId: string, trainId: string, available: number, locked: number, booked: number): Promise<any> {
        return this.sendMessage(
            TOPICS.SEAT_AVAILABILITY_UPDATED,
            `schedule-${scheduleId}`,
            { scheduleId, trainId, available, locked, booked }
        );
    }
}

export const inventoryProducer = new InventoryProducer();
export default inventoryProducer;
