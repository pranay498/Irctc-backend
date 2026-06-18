import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { searchService } from "../services/search.service";

export const searchTrainsController = asyncHandler(async (req: Request, res: Response) => {
  const { from, to, date } = req.query;

  if (!from || !to) {
    throw new ApiError(400, "Both 'from' and 'to' query parameters are required");
  }

  const result = await searchService.searchTrains(
    from as string,
    to as string,
    date as string
  );

  return res.status(200).json(
    new ApiResponse(200, result, "Trains searched successfully")
  );
});

export const autocompleteStationController = asyncHandler(async (req: Request, res: Response) => {
  const { prefix } = req.query;

  if (!prefix) {
    throw new ApiError(400, "'prefix' query parameter is required");
  }

  const result = await searchService.autocompleteStation(prefix as string);

  return res.status(200).json(
    new ApiResponse(200, result, "Stations autocomplete suggestions fetched")
  );
});
