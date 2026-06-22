import { prisma } from "../config/prisma";
import { SagaStep, SagaStepStatus } from "../generated/prisma/client";
import logger from "../config/logger";
import { inventoryClient } from "./inventoryClient";

/**
 * Executes Saga Step 1: Hold seats in inventory.
 */
export async function executeHoldSeats(
    booking: any,
    seatIds: string[],
    ttl: number,
    fromSeq?: number,
    toSeq?: number
): Promise<void> {
    logger.info(`Executing HOLD_SEATS step for booking ${booking.id}`);
    // TODO: Call inventory service to hold seats
}

/**
 * Executes Saga Step 2: Create payment order.
 */
export async function executeCreatePayment(booking: any): Promise<any> {
    logger.info(`Executing CREATE_PAYMENT step for booking ${booking.id}`);
    // Return stub payment order
    return {
        paymentOrderId: "stub-payment-id",
        gatewayOrderId: "stub-gateway-id",
        amount: booking.totalAmount,
        currency: "INR",
        keyId: "stub-key-id",
    };
}

/**
 * Compensate seat confirmation step.
 */
export async function compensateConfirmSeats(booking: any): Promise<void> {
    logger.info(`Compensating CONFIRM_SEATS for booking ${booking.id}`);
    // TODO: Implement compensation logic (e.g. notify inventory service to unconfirm seats)
}

/**
 * Compensate payment creation step.
 */
export async function compensateCreatePayment(booking: any): Promise<void> {
    logger.info(`Compensating CREATE_PAYMENT for booking ${booking.id}`);
    
}

/**
 * Compensate holding seats step.
 */
export async function compensateHoldSeats(booking: any, seatIds: string[]): Promise<void> {
     logger.info(`Compensating HOLD_SEATS for booking ${booking.id}`);
     try {
          // --- SEGMENT BOOKING: Pass segment params from booking for accurate compensation ---
          await inventoryClient.releaseSeats(
               booking.scheduleId, 
               seatIds, 
               booking.userId, 
               booking.fromSeq ?? undefined, 
               booking.toSeq ?? undefined
          );

          // Mark saga step as compensated
          await prisma.sagaLog.updateMany({
               where: { bookingId: booking.id, step: SagaStep.HOLD_SEATS, status: 'COMPLETED' },
               data: { status: SagaStepStatus.COMPENSATED },
          });
     } catch (error: any) {
          logger.error(`Failed to compensate HOLD_SEATS for booking ${booking.id}`, {
               error: error.message,
          });
     }
}

/**
 * Executes compensation steps in reverse order for completed saga steps.
 */
export async function compensateAll(booking: any, seatIds: string[]): Promise<void> {
     const completedSteps = await prisma.sagaLog.findMany({
          where: { bookingId: booking.id, status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
     });

     for (const step of completedSteps) {
          switch (step.step) {
               case SagaStep.CONFIRM_SEATS:
                    await compensateConfirmSeats(booking);
                    break;
               case SagaStep.CREATE_PAYMENT:
                    await compensateCreatePayment(booking);
                    break;
               case SagaStep.HOLD_SEATS:
                    await compensateHoldSeats(booking, seatIds);
                    break;
          }
     }
}
