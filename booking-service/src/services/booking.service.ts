import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { prisma } from "../config/prisma"
import logger from "../config/logger";
import { config } from "../config/index";
import * as saga from "./saga.service";
import { inventoryClient } from "./inventoryClient";

import { acquireSeatLocks, releaseSeatLocks } from "../utils/distributesLock";

// --- Stub interfaces for externals (fill in as needed) ---
interface SeatData {
  seatId: string;
  seatNumber: number;
  seatType: string;
  price: number;
  status: string;
  segmentStatus?: string;
}

interface Passenger {
  name: string;
  age: number;
  gender: string;
}

interface PaymentOrder {
  paymentOrderId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface BookingRecord {
  id: string;
  status: string;
  totalAmount: number;
  lockExpiresAt: Date | null;
  seats: any[];
  passengers: any[];
}

// --- Typed response shape ---
interface CreateBookingResponse {
  bookingId: string;
  status: string;
  totalAmount: number;
  lockExpiresAt: Date | null;
  seats: Pick<SeatData, 'seatId' | 'seatNumber' | 'seatType' | 'price'>[];
  passengers: Pick<Passenger, 'name' | 'age' | 'gender'>[];
  paymentOrder: PaymentOrder;
}

const checkIdempotency = async (key:string):Promise<CreateBookingResponse | null> => {
     const existing = await prisma.idempotencyRecord.findUnique({ where: { eventKey: key } });
     if (existing) {
          logger.info(`Idempotent request: ${key}`);
          return existing.response as any as CreateBookingResponse;
     }
     return null;
};

const saveIdempotency = async (key:string, response:CreateBookingResponse)=> {
     await prisma.idempotencyRecord.create({
          data: { eventKey: key, response: response as any },
     });
};



class BookingService{

// --- Main function ---
 createBooking = async ( userId: string, scheduleId: string,seatIds: string[], passengers: Passenger[], idempotencyKey: string, fromStationId?: string, toStationId?: string, fromSeq?: number,
  toSeq?: number
): Promise<CreateBookingResponse> => {
  // 1. Validate input
  if (!scheduleId || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw new ApiError(400, 'scheduleId and seatIds (non-empty array) are required');
  }
  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw new ApiError(400, 'passengers (non-empty array) is required');
  }
  if (seatIds.length !== passengers.length) {
    throw new ApiError(400, 'Number of seats must match number of passengers');
  }
  if (!idempotencyKey) {
    throw new ApiError(400, 'idempotencyKey is required');
  }
  if (fromSeq !== undefined && toSeq !== undefined && fromSeq >= toSeq) {
    throw new ApiError(400, 'fromStation must come before toStation in route');
  }

  // 2. Check idempotency
  const cached = await checkIdempotency(`booking:${idempotencyKey}`);
  if (cached) return cached;

  // 3. Fetch schedule availability
  const availability = await inventoryClient.getAvailability(scheduleId);
  if (availability.status !== 'ACTIVE') {
    throw new ApiError(400, 'Schedule is not active');
  }
  if (new Date(availability.departureDate) < new Date()) {
    throw new ApiError(400, 'Cannot book a train that has already departed');
  }

  // 4. Fetch segment-aware seat availability
  const seatData = await inventoryClient.getSeats(scheduleId, {
    fromSeq: fromSeq ?? undefined,
    toSeq: toSeq ?? undefined,
  });
  const seatMap = new Map<string, SeatData>(seatData.seats.map((s: SeatData) => [s.seatId, s]));

  // 5. Verify seats exist and are available
  const bookingSeats: SeatData[] = [];
  let totalAmount = 0;

  for (const seatId of seatIds) {
    const seat = seatMap.get(seatId);
    if (!seat) {
      throw new ApiError(404, `Seat ${seatId} not found in schedule`);
    }
    const isSegmentBooking = fromSeq !== undefined && toSeq !== undefined;
    const isAvailable = isSegmentBooking && seat.segmentStatus !== undefined
      ? seat.segmentStatus === 'AVAILABLE'
      : seat.status === 'AVAILABLE';

    if (!isAvailable) {
      throw new ApiError(409, `Seat #${seat.seatNumber} is not available for this segment`);
    }
    bookingSeats.push(seat);
    totalAmount += seat.price;
  }

  // 6. Sort seatIds (deadlock prevention)
  const sortedSeatIds = [...seatIds].sort();

  // 7. Acquire distributed locks
  const { acquired, lockValue } = await acquireSeatLocks(
    scheduleId,
    sortedSeatIds,
    `pre-${Date.now()}`,
    config.BOOKING_TTL_SECONDS,
    fromSeq,
    toSeq
  );

  if (!acquired) {
    throw new ApiError(409, 'One or more seats are being booked by another user. Please try again.');
  }

  let booking: BookingRecord | null = null;

  try {
    // 8. Create booking record
    const lockExpiresAt = new Date(Date.now() + config.BOOKING_TTL_SECONDS * 1000);

    booking = await prisma.booking.create({
      data: {
        userId,
        scheduleId,
        trainId: availability.trainId,
        trainNumber: availability.trainNumber,
        trainName: availability.trainName,
        departureDate: new Date(availability.departureDate),
        status: 'PENDING',
        totalAmount,
        seatCount: seatIds.length,
        fromStationId: fromStationId ?? null,
        toStationId: toStationId ?? null,
        fromSeq: fromSeq ?? null,
        toSeq: toSeq ?? null,
        idempotencyKey,
        lockExpiresAt,
        seats: {
          create: bookingSeats.map((seat) => ({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            seatType: seat.seatType,
            price: seat.price,
          })),
        },
        passengers: {
          create: passengers.map((p, index) => ({
            name: p.name,
            age: p.age,
            gender: p.gender,
            seatId: seatIds[index] ?? null,
          })),
        },
      },
      include: { seats: true, passengers: true },
    });

    if (!booking) {
      throw new ApiError(500, "Booking creation failed");
    }

    // 9. Saga step 1: Hold seats in inventory
    await saga.executeHoldSeats(booking, sortedSeatIds, config.LOCK_TTL_SECONDS, fromSeq, toSeq);

    // 10. Saga step 2: Create payment order
    const paymentOrder = await saga.executeCreatePayment(booking);

    // 11. Refresh booking after saga mutations
    booking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { seats: true, passengers: true },
    });

    if (!booking) throw new ApiError(500, 'Booking record lost after creation');

    const response: CreateBookingResponse = {
      bookingId: booking.id,
      status: booking.status,
      totalAmount: booking.totalAmount,
      lockExpiresAt: booking.lockExpiresAt,
      seats: booking.seats.map((s) => ({
        seatId: s.seatId,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        price: s.price,
      })),
      passengers: booking.passengers.map((p) => ({
        name: p.name,
        age: p.age,
        gender: p.gender,
      })),
      paymentOrder: {
        paymentOrderId: paymentOrder.paymentOrderId,
        gatewayOrderId: paymentOrder.gatewayOrderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        keyId: paymentOrder.keyId,
      },
    };

    await saveIdempotency(`booking:${idempotencyKey}`, response);
    return response;

  } catch (error) {
    logger.error(`Booking creation failed for user ${userId}`, {
      error: error instanceof Error ? error.message : String(error),
    });

    if (booking) {
      await saga.compensateAll(booking, sortedSeatIds);
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'FAILED',
          failureReason:
            (error as any)?.response?.data?.message ??
            (error instanceof Error ? error.message : String(error)),
        },
      });
    }

    await releaseSeatLocks(scheduleId, sortedSeatIds, lockValue, fromSeq, toSeq);
    throw error;
  }
};

}

export const bookingService = new BookingService();