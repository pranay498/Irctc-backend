import express from "express";
import { createStation } from "../controllers/station.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/station", authMiddleware, createStation);

export default router;
