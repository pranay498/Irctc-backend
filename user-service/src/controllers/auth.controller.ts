import { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";

import { ApiError } from "../utils/ApiError";

import { ApiResponse } from "../utils/ApiResponse";

import * as authServices from "../services/auth.service";

import { config } from "../config";
import logger from "../config/logger";
import { getDeviceFingerprint } from "../utils/deviceFingerprint";

console.log("AUTH CONTROLLER FILE LOADED");


export const sendOtp = asyncHandler( async (req: Request,res: Response ) => {

        console.log("SEND OTP CONTROLLER HIT");

        const {firstName,lastName,email,password,confirmPassword,} = req.body;

        if (!firstName ||!lastName ||!email ||!password ||!confirmPassword) 
        {
            throw new ApiError(400,"All fields are required");
        }

        if (password !== confirmPassword) {
            throw new ApiError(400,"Password and confirm password are not matching");
        }

        const { otpSessionId } = await authServices.otp(
            firstName,
            lastName,
            email,
            password,
            confirmPassword
        );

        res.cookie("otpSessionId",otpSessionId,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: config.OTP_EXPIRY * 1000,
            }
        );
        logger.info(`OTP generated and session started for email: ${email}`);
        
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    otpSessionId,
                },
                "OTP sent successfully"
            )
        );
    }
);

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {

    const { otp } = req.body;

    const otpSessionId = req.cookies.otpSessionId;

    if (!otp || !otpSessionId) {
        throw new ApiError(400, "OTP is required or OTP session not found");
    }

    const user = await authServices.verifyOtp(otp, otpSessionId);

    // Clear OTP Session Cookie
    res.clearCookie("otpSessionId", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user,
            },
            "User registered successfully"
        )
    );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, deviceId: bodyDeviceId } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const deviceId = bodyDeviceId || req.headers["x-device-id"] || getDeviceFingerprint(req);

    const { user, accessToken, refreshToken } = await authServices.login(email, password, deviceId as string);

    // Set secure HTTP-only cookies
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user,
                accessToken,
                refreshToken,
            },
            "Logged in successfully"
        )
    );
});

export const rotateRefreshToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        throw new ApiError(401, "Refresh token is missing");
    }

    const deviceId = getDeviceFingerprint(req);

    const { user, accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await authServices.rotateRefreshToken(refreshToken, deviceId);

    // Set new secure HTTP-only cookies
    res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
            "Token rotated successfully"
        )
    );
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { idToken, deviceId: bodyDeviceId } = req.body;

    if (!idToken) {
        throw new ApiError(400, "Google ID token is required");
    }

    const deviceId = bodyDeviceId || req.headers["x-device-id"] || getDeviceFingerprint(req);

    const { user, accessToken, refreshToken } = await authServices.googleLogin(idToken, deviceId as string);

    // Set secure HTTP-only cookies
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user,
                accessToken,
                refreshToken,
            },
            "Logged in with Google successfully"
        )
    );
});



