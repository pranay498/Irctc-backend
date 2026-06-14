import express from "express";
import { createSchedule } from "../controllers/schedule.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/schedule", authMiddleware, createSchedule);

export default router;
