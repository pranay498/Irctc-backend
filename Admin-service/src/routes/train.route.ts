import express from "express"
import { createTrainController, createRouteController, getAllTrainsController, getTrainByIdController } from "../controllers/train.controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const router = express.Router()


router.post("/train", authMiddleware, createTrainController);
router.post("/route", authMiddleware, createRouteController);
router.get("/train", authMiddleware, getAllTrainsController);
router.get("/train/:trainId", authMiddleware, getTrainByIdController);

export default router
