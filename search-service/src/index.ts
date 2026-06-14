import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import logger from "./config/logger";
import { connectElasticsearch } from "./config/elasticsearch";
import { searchConsumer } from "./kafka/producer/search.consumer";

const app = express();

app.use(cors({ origin: config.ALLOWED_ORIGINS }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req: Request, res: Response) => {
    res.status(200).send("Search Service is healthy");
});

const startServer = async () => {
    try {
        await connectElasticsearch();
        await searchConsumer.start();

        app.listen(config.PORT, () => {
            logger.info(`🚀 Search Service running on port ${config.PORT}`);
        });
    } catch (error) {
        logger.error(`Failed to start Search Service: ${error}`);
        process.exit(1);
    }
};

startServer();
