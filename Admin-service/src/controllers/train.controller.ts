import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { createTrain, createRoute, getAllTrains, getTrainById } from "../service/train.service";

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

export const createRouteController = asyncHandler(async (req: Request, res: Response) => {
  const { trainId, stations } = req.body;

  if (!trainId || !stations) {
    throw new ApiError(400, "trainId and stations are required");
  }

  if (!Array.isArray(stations) || stations.length === 0) {
    throw new ApiError(400, "stations must be a non-empty array");
  }

  const route = await createRoute({
    trainId,
    stations,
  });

  return res.status(201).json(
    new ApiResponse(201, route, "Route created successfully")
  );
});

export const getAllTrainsController = asyncHandler(async (req: Request, res: Response) => {

  const trains = await getAllTrains();
  return res.status(200).json(
    new ApiResponse(200, trains, "Trains fetched successfully")
  );
});

export const getTrainByIdController = asyncHandler(async (req: Request, res: Response) => {

  const { trainId } = req.params;
  if (!trainId || typeof trainId !== "string") {
    throw new ApiError(400, "Train Id is missing or invalid");
  }

  const train = await getTrainById(trainId);
  return res.status(200).json(
    new ApiResponse(200, train, "Train fetched successfully")
  );
});
