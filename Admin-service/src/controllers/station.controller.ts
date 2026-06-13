import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import * as stationService from "../service/station.service";

export const createStation = asyncHandler(
  async (req: Request, res: Response) => {

    const { name, city, code, state } = req.body;

    if (!name || !city || !code || !state) {
      throw new ApiError(400, "All fields are required");
    }

    const station = await stationService.createStation({
      code: code.toUpperCase(),
      city,
      name,
      state,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { station },
        "Station created successfully"
      )
    );
  }
);