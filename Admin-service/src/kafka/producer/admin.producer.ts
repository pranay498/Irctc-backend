import { getProducer } from "../../config/kafka";
import logger from "../../config/logger";
import { TOPICS } from "../../utils/constants";

class AdminProducer {
    private isInitialized = false;

    async initialize(): Promise<void> {
        this.isInitialized = true;
    }

    async sendMessage(topic: string, key: string, value: any): Promise<void> {
        try {
            await this.initialize();
            const producer = getProducer();

            await producer.send({
                topic,
                messages: [
                    {
                        key: key || `${topic}-${Date.now()}`,
                        value: JSON.stringify(value),
                        timestamp: Date.now().toString(),
                    },
                ],
            });
            logger.info(`Message sent to topic: ${topic}`);
        } catch (error) {
            logger.error(`Error sending message via Kafka to topic ${topic}: ${error}`);
            throw error;
        }
    }

    async publishStationCreated(station: any): Promise<void> {
        return this.sendMessage(
            TOPICS.STATION_CREATED,
            `station-${station.id}`,
            {
                eventType: "STATION_CREATED",
                data: station,
                timestamp: new Date().toISOString(),
            }
        );
    }

    async publishTrainCreated(train: any): Promise<void> {
        return this.sendMessage(
            TOPICS.TRAIN_CREATED,
            `train-${train.id}`,
            {
                eventType: "TRAIN_CREATED",
                data: train,
                timestamp: new Date().toISOString(),
            }
        );
    }

    async publishScheduleCreated(scheduleData: any): Promise<void> {
        return this.sendMessage(
            TOPICS.SCHEDULE_CREATED,
            `schedule-${scheduleData.scheduleId}`,
            {
                eventType: "SCHEDULE_CREATED",
                data: scheduleData,
                timestamp: new Date().toISOString(),
            }
        );
    }
}

export const adminProducer = new AdminProducer();
export default adminProducer;
