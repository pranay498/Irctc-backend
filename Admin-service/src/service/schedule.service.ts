import logger from "../config/logger";
import { prisma } from "../config/prisma";
import { adminProducer } from "../kafka/producer/admin.producer";
import { ApiError } from "../utils/ApiError";

interface CreateScheduleInput {
  trainId: string;
  departureDate: string;
}

export const createSchedule = async (data: CreateScheduleInput) => {
  const { trainId, departureDate } = data;
  
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      seats: { orderBy: { seatNumber: 'asc' } },
      route: {
        include: {
          routeStations: {
            include: { station: true },
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      },
    },
  });

  if (!train) throw new ApiError(404, 'Train not found');
  if (!train.route) throw new ApiError(400, 'Train has no route defined. Create a route first.');
  if (train.seats.length === 0) throw new ApiError(400, 'Train has no seats defined.');

  const parsedDate = new Date(departureDate);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'Invalid departure date format. Use YYYY-MM-DD');
  }

  // Check for duplicate schedule
  const existing = await prisma.schedule.findUnique({
    where: { 
      trainId_departureDate: { 
        trainId, 
        departureDate: parsedDate 
      } 
    },
  });
  
  if (existing) {
    throw new ApiError(409, 'Schedule already exists for this train on this date');
  }

  const schedule = await prisma.schedule.create({
    data: { 
      trainId, 
      departureDate: parsedDate 
    },
  });

  // Build a rich event payload with everything consumers need
  const eventPayload = {
    scheduleId: schedule.id,
    trainId: train.id,
    trainNumber: train.trainNumber,
    trainName: train.trainName,
    coachName: train.coachName,
    totalSeats: train.totalSeats,
    departureDate: departureDate,
    status: schedule.status,
    seats: train.seats.map((s) => ({
      seatId: s.id,
      seatNumber: s.seatNumber,
      seatType: s.seatType,
      price: s.price,
    })),
    route: train.route.routeStations.map((rs) => ({
      stationId: rs.station.id,
      stationName: rs.station.name,
      stationCode: rs.station.code,
      city: rs.station.city,
      sequenceNumber: rs.sequenceNumber,
      arrivalTime: rs.arrivalTime,
      departureTime: rs.departureTime,
      distanceFromOrigin: rs.distanceFromOrigin,
    })),
  };

  // This event goes to both inventory-service and search-service via Kafka
  await adminProducer.publishScheduleCreated(eventPayload).catch((err) => {
    logger.error("Failed to publish schedule created event", { error: err.message });
  });
  
  logger.info(`Schedule created and event published for train ${train.trainNumber} on ${departureDate}`);

  return schedule;
};
