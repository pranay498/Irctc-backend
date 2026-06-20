import express from "express";
import { config } from "./config/index";
import { connectKafka } from "./config/kafka";
import { inventoryConsumer } from "./kafka/consumer/inventory.consumer";
import { logger } from "./config/logger";

const app = express();

app.get("/health", (req, res) => {
    res.status(200).send("Inventory Service is healthy");
});

const startServer = async () => {
    try {
        // Connect to Kafka (both producer and consumer)
        await connectKafka();

        // Start the consumer loop
        await inventoryConsumer.start();

        const PORT = config.PORT;
        app.listen(PORT, () => {
            logger.info(`🚀 Inventory Service running on port ${PORT}`);
        });
    } catch (error: any) {
        logger.error(`Failed to start Inventory Service: ${error.message}`);
        process.exit(1);
    }
};

startServer();
