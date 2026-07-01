import { Router } from "express";

import { config } from "../config";
import { requireAuth } from "../middlewares/auth.middleware";
import { ApiResponse } from "../utils/ApiResponse";
import { createProxy, circuitBreakers } from "../service/proxy";
import { userSlidingWindowRateLimit, endpointSlidingWindowRateLimit } from "../middlewares/slidingWindowRateLimiting";
import { globalTokenBucketRateLimit } from "../middlewares/tokenBucket.middleware";

const router = Router();

const healthHandler = (req: any, res: any) => {
    res.status(200).json(new ApiResponse(200, { status: "UP" }, "Api Gateway healthy"));
};

const circuitBreakerHandler = (req: any, res: any) => {
    const states = Object.keys(circuitBreakers).reduce((acc: any, key) => {
        acc[key] = (circuitBreakers as any)[key].getState();
        return acc;
    }, {});
    res.status(200).json(new ApiResponse(200, states, "Circuit breaker states retrieved"));
};

// Apply IP Rate Limit globally to all gateway routes
const userServiceProxy = createProxy("userservice" , config.USER_SERVICE_URL)

router.post(
    '/users/auth/send-otp',
    globalTokenBucketRateLimit(),
    endpointSlidingWindowRateLimit(5, 3600000),
    userServiceProxy
);

router.post(
    '/users/auth/verify-otp',
    globalTokenBucketRateLimit(),
    endpointSlidingWindowRateLimit(10, 3600000),
    userServiceProxy
);

router.post(
    '/users/auth/login',
    globalTokenBucketRateLimit(),
    endpointSlidingWindowRateLimit(100, 900000),
    userServiceProxy
);

router.post(
    '/users/auth/google-auth',
    globalTokenBucketRateLimit(),
    endpointSlidingWindowRateLimit(10, 900000),
    userServiceProxy
);

router.post(
    '/users/auth/refresh',
    globalTokenBucketRateLimit(),
    endpointSlidingWindowRateLimit(20, 900000),
    userServiceProxy
);


router.get(
    '/users/user/profile',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    userServiceProxy
);

router.put(
    '/users/user/profile',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    userServiceProxy
);

router.delete(
    '/users/user/profile',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    userServiceProxy
);

const adminServiceProxy = createProxy('adminService', config.SERVICES.ADMIN_SERVICE_URL);


router.post(
    '/admins/stations/station',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    adminServiceProxy
);

router.post(
    '/admins/trains/train',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    adminServiceProxy
);

router.post(
    '/admins/trains/route',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    adminServiceProxy
);

router.post(
    '/admins/schedules/schedule',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    adminServiceProxy
);

router.put(
    '/admins/schedules/schedule/:scheduleId',
    globalTokenBucketRateLimit(),
    requireAuth,
    userSlidingWindowRateLimit(),
    adminServiceProxy
);

router.get(
    '/admins/stations/station',
    globalTokenBucketRateLimit(),
    requireAuth,
    adminServiceProxy
);

router.get(
    '/admins/trains/train/:trainId',
    globalTokenBucketRateLimit(),
    requireAuth,
    adminServiceProxy
);

const searchServiceProxy = createProxy('searchService', config.SERVICES.SEARCH_SERVICE_URL);


router.get(
    '/search/trains',
    globalTokenBucketRateLimit(),
    searchServiceProxy
);

router.get(
    '/search/autocomplete',
    globalTokenBucketRateLimit(),
    searchServiceProxy
);

const inventoryServiceProxy = createProxy('inventoryService', config.SERVICES.INVENTORY_SERVICE_URL);


router.get(
    '/inventory/schedules/:scheduleId/availability',
    globalTokenBucketRateLimit(),
    inventoryServiceProxy
);

router.get(
    '/inventory/schedules/:scheduleId/seats',
    globalTokenBucketRateLimit(),
    requireAuth,
    inventoryServiceProxy
);

const bookingServiceProxy = createProxy('bookingService', config.SERVICES.BOOKING_SERVICE_URL);


router.post(
    '/bookings/bookings',
    globalTokenBucketRateLimit(),
    requireAuth,
    endpointSlidingWindowRateLimit(5, 60000),
    bookingServiceProxy
);

router.get(
    '/bookings/bookings',
    globalTokenBucketRateLimit(),
    requireAuth,
    bookingServiceProxy
);

router.get(
    '/bookings/bookings/:bookingId',
    globalTokenBucketRateLimit(),
    requireAuth,
    bookingServiceProxy
);

router.post(
    '/bookings/bookings/:bookingId/verify-payment',
    globalTokenBucketRateLimit(),
    requireAuth,
    endpointSlidingWindowRateLimit(20, 60000),
    bookingServiceProxy
);

router.post(
    '/bookings/bookings/:bookingId/cancel',
    globalTokenBucketRateLimit(),
    requireAuth,
    endpointSlidingWindowRateLimit(10, 60000),
    bookingServiceProxy
);

const paymentServiceProxy = createProxy('paymentService', config.SERVICES.PAYMENT_SERVICE_URL);


router.post(
    '/payments/webhooks/razorpay',
    paymentServiceProxy
);



router.get(
    '/gateway/health',
    globalTokenBucketRateLimit(),
    healthHandler
);

router.get(
    '/gateway/circuit-breakers',
    globalTokenBucketRateLimit(),
    circuitBreakerHandler
);

export default router;
