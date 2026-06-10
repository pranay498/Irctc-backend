import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
