import { Router } from "express";
import { ipRateLimit } from "../middlewares/rateLimiting.middleware";
import { config } from "../config";
import { requireAuth } from "../middlewares/auth.middleware";
import { ApiResponse } from "../utils/ApiResponse";
import { createProxy } from "../service/proxy";

const router = Router();

// Apply IP Rate Limit globally to all gateway routes
const userServiceProxy = createProxy("userservice" , config.USER_SERVICE_URL)

router.post(
    '/users/auth/login',
    ipRateLimit,
    userServiceProxy
)

router.post(
    '/users/auth/profile',
    ipRateLimit,
    requireAuth,
    userServiceProxy
)

router.get('/gateway/health',(req,res)=>{
res.status(200).json(new ApiResponse(200 , true , "Api Gateway healthy") )
})
 
export default router;
