import express from "express";
import { getUserContext, AuthenticatedRequest } from "../middlewares/getUserContext.middleware";
import { internalAuth } from "../middlewares/internalAuth.middleware";
import { config } from "../config";
import {
     getScheduleAvailability,
     getScheduleSeats,
     lockSeats,
     unlockSeats,
     confirmSeats,
     cancelBooking,
} from "../controllers/inventory.controller";

const router = express.Router();

// Allows either user context (from gateway) or internal service key (from booking-service)
function userOrInternal(req: AuthenticatedRequest, res: any, next: any) {
     const serviceKey = req.headers["x-internal-service-key"];
     if (serviceKey && serviceKey === config.INTERNAL_SERVICE_KEY) {
          req.user = { id: "internal-service" };
          return next();
     }
     return getUserContext(req, res, next);
}

// Public: aggregate availability (used by search results)
router.get("/schedules/:scheduleId/availability", getScheduleAvailability);

// Authenticated OR internal: individual seat statuses
router.get("/schedules/:scheduleId/seats", userOrInternal as any, getScheduleSeats);

// Internal: called by booking-service (protected by service key)
router.post("/seats/lock", internalAuth, lockSeats);
router.post("/seats/unlock", internalAuth, unlockSeats);
router.post("/seats/confirm", internalAuth, confirmSeats);
router.post("/seats/cancel-booking", internalAuth, cancelBooking);

export default router;
