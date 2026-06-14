import { consumer } from "../../config/kafka";
import logger from "../../config/logger";
import { searchService } from "../../services/search.service";

const KAFKA_TOPICS = {
  STATION_CREATED: "station-created",
  ROUTE_CREATED: "route-created",
  SCHEDULE_CREATED: "schedule-created",
  SCHEDULE_CANCELLED: "schedule-cancelled",
  SEAT_AVAILABILITY_UPDATED: "seat-availability-updated",
} as const;

class SearchConsumer {
  async start(): Promise<void> {
    try {
      await consumer.connect();
      logger.info("🚀 Search consumer connected successfully");

      await consumer.subscribe({
        topics: Object.values(KAFKA_TOPICS),
        fromBeginning: true,
      });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) return;
            const value = JSON.parse(message.value.toString());
            logger.info(`Processing ${topic}`, { partition, offset: message.offset });
            
            switch (topic) {
              case KAFKA_TOPICS.STATION_CREATED:
                await searchService.indexStation(value);
                break;
              case KAFKA_TOPICS.ROUTE_CREATED:
                await searchService.indexTrainRoute(value);
                break;
              case KAFKA_TOPICS.SCHEDULE_CREATED:
                await searchService.indexSchedule(value);
                break;
              case KAFKA_TOPICS.SCHEDULE_CANCELLED:
                await searchService.cancelSchedule(value);
                break;
              case KAFKA_TOPICS.SEAT_AVAILABILITY_UPDATED:
                await searchService.updateSeatAvailability(value);
                break;
              default:
                logger.warn(`Unhandled topic in search-service: ${topic}`);
            }
          } catch (error: any) {
            logger.error(`Error processing message from topic ${topic}: ${error.message}`);
          }
        },
      });
    } catch (error: any) {
      logger.error(`Error in SearchConsumer start: ${error.message}`);
      throw error;
    }
  }
}

export const searchConsumer = new SearchConsumer();
