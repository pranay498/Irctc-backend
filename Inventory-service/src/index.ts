import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config/index";
import { connectKafka } from "./config/kafka";
import { inventoryConsumer } from "./kafka/consumer/inventory.consumer";
import { logger } from "./config/logger";
import { corsMiddleware } from "./middlewares/cors.middleware";
import { requestLogger } from "./middlewares/req.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import inventoryRoutes from "./routes/inventory.route";

const app = express();

// Middlewares
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// Health Route
app.get("/health", (req, res) => {
    res.status(200).send("Inventory Service is healthy");
});

// Inventory Routes
app.use("/api/v1/inventory", inventoryRoutes);

// Error handling middleware
app.use(errorHandler as any);

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

