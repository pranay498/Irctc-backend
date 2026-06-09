import express, { Application, Request, Response } from "express";
import { config } from "./config";
import logger from "./config/logger";
import { emailConsumer } from "./kafka/consumer/email.consumer";

const app: Application = express();
app.use(express.json());

// Health Endpoint
app.get("/health", (req: Request, res: Response) => {
    res.status(200).send("Notification Service is healthy");
});

const startServer = async () => {
    try {
        // Run the email consumer
        await emailConsumer.start();

        app.listen(config.PORT, () => {
            logger.info(`🚀 Notification Service running on port ${config.PORT}`);
        });
    } catch (error) {
        logger.error(`Failed to start notification-service: ${error}`);
        process.exit(1);
    }
};



startServer();
