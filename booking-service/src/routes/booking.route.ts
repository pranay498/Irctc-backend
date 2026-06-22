import { Router } from "express";
import { createBooking } from "../controllers/booking.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// POST /api/v1/bookings - Create a booking (requires authentication)
router.post("/", authMiddleware, createBooking);

export default router;
