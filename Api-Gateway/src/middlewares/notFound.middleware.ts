import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    next(new ApiError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`));
};

export default notFoundHandler;
