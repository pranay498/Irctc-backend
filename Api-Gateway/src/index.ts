import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import logger from "./config/logger";

import { errorHandler } from "./middlewares/error.middleware";
import { notFoundHandler } from "./middlewares/notFound.middleware";
import routes from "./routes/index"

const app: Application = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors({
    origin: "*", // Adjust as necessary for production
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
    logger.info(`[Api-Gateway] Incoming Request: ${req.method} ${req.url}`);
    next();
});

// Health Route
app.get("/health", (req: Request, res: Response) => {
    res.status(200).send("API Gateway is healthy");
});


app.use('/api',routes)
// Mounting gateway proxies

// 404 Route handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

const startServer = () => {
    try {
        app.listen(config.PORT, () => {
            logger.info(`🚀 API Gateway running on port ${config.PORT} in ${config.NODE_ENV} mode`);
        });
    } catch (error) {
        logger.error(`Failed to start API Gateway: ${error}`);
        process.exit(1);
    }
};

startServer();
