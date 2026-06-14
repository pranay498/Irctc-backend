import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import * as scheduleService from "../service/schedule.service";

export const createSchedule = asyncHandler(
  async (req: Request, res: Response) => {
    const { trainId, departureDate } = req.body;

    if (!trainId || !departureDate) {
      throw new ApiError(400, "trainId and departureDate are required");
    }

    const schedule = await scheduleService.createSchedule({
      trainId,
      departureDate,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, schedule, "Train Schedule created successfully"),
      );
  },
);
