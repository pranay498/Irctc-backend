import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { userService } from "../services/user.service";

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userID = req.user?.id;
    
    if (!userID) {
        throw new ApiError(401, "Unauthorized access");
    }

    const user = await userService.getProfile(userID);

    return res.status(200).json(
        new ApiResponse(200, user, "Profile retrieved successfully")
    );
});