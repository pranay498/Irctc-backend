import logger from "../config/logger";
import { prisma } from "../config/prisma";
import { adminProducer } from "../kafka/producer/admin.producer";
import { ApiError } from "../utils/ApiError";
import { SeatType } from "../generated/prisma/client";

interface SeatInput {
  seatNumber: number | string;
  seatType: SeatType;
  price: number;
}

interface CreateTrainInput {
  trainNumber: string;
  trainName: string;
  coachName?: string;
  seats: SeatInput[];
}

export const createTrain = async (data: CreateTrainInput) => {
  const { trainNumber, trainName, coachName, seats } = data;

  const existing = await prisma.train.findUnique({
    where: { trainNumber },
  });

  if (existing) {
    throw new ApiError(409, "Train with this number already exists");
  }

  const seatNumbers = seats.map((s) => Number(s.seatNumber));

  if (new Set(seatNumbers).size !== seatNumbers.length) {
    throw new ApiError(400, "Duplicate seat numbers found");
  }

  const train = await prisma.train.create({
    data: {
      trainNumber,
      trainName,
      coachName: coachName || "AC",
      totalSeats: seats.length,
      seats: {
        create: seats.map((seat) => ({
          seatNumber: Number(seat.seatNumber),
          seatType: seat.seatType,
          price: seat.price,
        })),
      },
    },
    include: {
      seats: {
        orderBy: {
          seatNumber: "asc",
        },
      },
    },
  });

  await adminProducer.publishTrainCreated(train).catch((err) => {
    logger.error("Failed to publish train created event", { error: err.message });
  });

  return train;
};
