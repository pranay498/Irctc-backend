import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { createTrain } from "../service/train.service";

export const createTrainController = asyncHandler(async (req: Request, res: Response) => {
  const { trainNumber, trainName, coachName, seats } = req.body;

  if (!trainNumber || !trainName || !coachName || !seats) {
    throw new ApiError(400, "trainNumber, trainName, coachName, and seats are required");
  }

  if (Array.isArray(seats) && seats.length === 0) {
    throw new ApiError(400, "Atleast one seat must be defined...");
  }

  const train = await createTrain({
    trainNumber,
    trainName,
    coachName,
    seats,
  });

  return res.status(201).json(
    new ApiResponse(201, train, "Train added successfully")
  );
});
