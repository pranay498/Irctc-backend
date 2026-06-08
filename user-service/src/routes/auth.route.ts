import express, { Router } from "express";

console.log("AUTH ROUTE FILE LOADED");

import { sendOtp, verifyOtp, login, rotateRefreshToken, googleLogin } from "../controllers/auth.controller";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/refresh-token", rotateRefreshToken);
router.post("/google", googleLogin);

export default router;