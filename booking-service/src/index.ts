import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import bookingRoutes from "./routes/booking.route";
import { config } from "./config/index";
import logger from "./config/logger";
import { connectRedis } from "./config/redis";
import { corsMiddleware } from "./middlewares/cors.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { connectKafka } from "./config/kafka";
import { requestLogger } from "./middlewares/req.middleware";

const app: Application = express();

// Middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Print ALL requests via requestLogger
app.use(requestLogger);

// Health Route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Booking Service is healthy");
});

// Booking Routes
app.use("/api/v1/bookings", bookingRoutes);

// Error Middleware
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectRedis();

    await connectKafka();

    app.listen(config.PORT, () => {
      logger.info(`🚀 Booking Service running on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);

    process.exit(1);
  }
};

startServer();
