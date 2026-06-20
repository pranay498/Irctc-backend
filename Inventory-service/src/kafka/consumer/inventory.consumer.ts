import { consumer, getProducer } from "../../config/kafka";
import { logger } from "../../config/logger";
import { TOPICS } from "../../utils/constants";
import { withDLQ } from "../../utils/DLQ";
import * as inventoryService from "../../service/inventory.service";

class InventoryConsumer {
    async start(): Promise<void> {
        try {
            const producer = getProducer();

            logger.info("🚀 Connecting Inventory consumer...");

            await consumer.subscribe({
                topics: [
                    TOPICS.SCHEDULE_CREATED,
                    TOPICS.SCHEDULE_CANCELLED,
                ],
                fromBeginning: true,
            });
            logger.info("🚀 Inventory consumer subscribed successfully");

            await consumer.run({
                eachMessage: withDLQ(
                    producer,
                    TOPICS.DLQ_BOOKING,
                    logger,
                    async ({ topic, partition, message, parsedValue }) => {
                        logger.info(`Processing topic ${topic}`, {
                            partition,
                            offset: message.offset,
                        });

                        switch (topic) {
                            case TOPICS.SCHEDULE_CREATED:
                                await inventoryService.initializeInventory(parsedValue as any);
                                break;
                            case TOPICS.SCHEDULE_CANCELLED:
                                await inventoryService.cancelScheduleInventory(parsedValue as any);
                                break;
                            default:
                                logger.warn(`Unhandled topic: ${topic}`);
                        }
                    }
                ),
            });

            logger.info("🚀 Inventory consumer running successfully");
        } catch (error: any) {
            logger.error(`Error in InventoryConsumer: ${error.message}`);
            throw error;
        }
    }
}

export const inventoryConsumer = new InventoryConsumer();
export default inventoryConsumer;
