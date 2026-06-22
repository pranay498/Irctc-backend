import { Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { bookingService } from "../services/booking.service";

/**
 * Creates a new train seat booking.
 * Handles segment-based booking parameter passing.
 */
export const createBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response,next: NextFunction): Promise<void> => {
     if (!req.user || !req.user.id) {
          throw new ApiError(401, 'Authentication required');
     }

     const userId = String(req.user.id);
     const {scheduleId, seatIds, passengers, idempotencyKey, fromStationId, toStationId, fromSeq, toSeq } = req.body;

     if (!scheduleId || !seatIds || !passengers || !idempotencyKey) {
          throw new ApiError(400, 'scheduleId, seatIds, passengers, and idempotencyKey are required');
     }

     // --- SEGMENT BOOKING: Pass segment params to service ---
     const result = await bookingService.createBooking(userId, scheduleId, seatIds, passengers, idempotencyKey, fromStationId,toStationId, Number(fromSeq),Number(toSeq));

     res.status(201).json({ success: true, data: result });
});
