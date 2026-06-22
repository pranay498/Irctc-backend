import axios from 'axios';
import { config } from '../config';
import logger from '../config/logger';

const client = axios.create({
     baseURL: config.INVENTORY_SERVICE_URL,
     timeout: 10000,
     headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': config.INTERNAL_SERVICE_KEY,
     },
});

export interface SeatFilters {
     status?: string;
     seatType?: string;
     fromSeq?: number;
     toSeq?: number;
}

/**
 * Retry wrapper with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
     let lastError: any;
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
               return await fn();
          } catch (error: any) {
               lastError = error;
               // Don't retry client errors (4xx) — only server/network errors
               const status = error.response?.status;
               if (status && status >= 400 && status < 500) throw error;

               if (attempt < maxRetries) {
                    const delay = 200 * Math.pow(2, attempt - 1);
                    logger.warn(`Inventory client retry ${attempt}/${maxRetries} after ${delay}ms`, {
                         error: error.message,
                    });
                    await new Promise(resolve => setTimeout(resolve, delay));
               }
          }
     }
     throw lastError;
}

/**
 * Extract error message from axios error.
 */
export function extractError(error: any) {
     if (error.response?.data) {
          return {
               status: error.response.status,
               message: error.response.data.message || error.message,
               code: error.response.data.error,
          };
     }
     return { status: 500, message: error.message, code: 'INVENTORY_SERVICE_ERROR' };
}

export const inventoryClient = {
     async getAvailability(scheduleId: string): Promise<any> {
          return withRetry(async () => {
               const { data } = await client.get(`/schedules/${scheduleId}/availability`);
               return data.data;
          });
     },

     async getSeats(scheduleId: string, filters: SeatFilters = {}): Promise<any> {
          return withRetry(async () => {
               const params: any = {};
               if (filters.status) params.status = filters.status;
               if (filters.seatType) params.seatType = filters.seatType;
               if (filters.fromSeq) params.fromSeq = filters.fromSeq;
               if (filters.toSeq) params.toSeq = filters.toSeq;

               const { data } = await client.get(`/schedules/${scheduleId}/seats`, { params });
               return data.data;
          });
     },

     async holdSeats( scheduleId: string, seatIds: string[], userId: string, ttlSeconds: number, fromSeq?: number, toSeq?: number ): Promise<any> {
          return withRetry(async () => {
               const { data } = await client.post('/seats/lock', {
                    scheduleId,
                    seatIds,
                    userId,
                    ttlSeconds,
                    fromSeq,
                    toSeq,
               });
               return data.data;
          });
     },

     async releaseSeats(scheduleId: string, seatIds: string[], userId: string, fromSeq?: number, toSeq?: number): Promise<any> {
          return withRetry(async () => {
               const { data } = await client.post('/seats/unlock', {
                    scheduleId,
                    seatIds,
                    userId,
                    fromSeq,
                    toSeq,
               });
               return data.data;
          });
     },

     async confirmSeats(scheduleId: string, seatIds: string[], userId: string, bookingId: string, fromSeq?: number, toSeq?: number): Promise<any> {
          return withRetry(async () => {
               const { data } = await client.post('/seats/confirm', {
                    scheduleId,
                    seatIds,
                    userId,
                    bookingId,
                    fromSeq,
                    toSeq,
               });
               return data.data;
          });
     },

     async cancelBooking(scheduleId: string, bookingId: string, userId: string): Promise<any> {
          return withRetry(async () => {
               const { data } = await client.post('/seats/cancel-booking', {
                    scheduleId,
                    bookingId,
                    userId,
               });
               return data.data;
          });
     },
};
