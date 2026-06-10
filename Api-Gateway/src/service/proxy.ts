import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ICircuitBreaker } from ".././types";
import { config } from "../config";
import logger from "../config/logger";

class CircuitBreaker implements ICircuitBreaker {

    public serviceName: string;
    public failureCount: number;
    public threshold: number;
    public timeout: number;
    public state: string;
    public nextAttempt: Date;

    constructor(
        serviceName: string,
        threshold = Number(config.CIRCUIT_BREAKER_THRESHOLD),
        timeout = Number(config.CIRCUIT_BREAKER_FAILURE_TIMEOUT)
    ) {
        this.serviceName = serviceName;
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = "closed";
        this.nextAttempt = new Date();
    }

 async execute(request: Request, response: Response) {

    if (this.state === "open") {

        if (Date.now() < this.nextAttempt.getTime()) {

            throw new Error(
                `${this.serviceName} service unavailable`
            );
        }
        this.state = "half-open";
        logger.info(`Circuit is half open ${this.serviceName}` )
    }
 }

 async onSucess(request: Request, response: Response){

    this.failureCount = 0;
    if(this.state === "half-open")
        this.state = "closed";
    logger.info(`Circuit is closed ${this.serviceName}`)
 }

 async onFailure(request:Request ,response:Response){

    this.failureCount++;
    if (this.failureCount > this.threshold){
        this.state = "open";
        this.nextAttempt = new Date(Date.now() + this.timeout);
        logger.error(`Circuit is open ${this.serviceName}`)
    }
 }
  getState(){
        return{
            state: this.state,
            failureCount: this.failureCount,
            threshold: this.threshold,
            timeout: this.timeout,
            nextAttempt: this.nextAttempt
        }
  }

}

export const circuitBreaker = {
    userService:new CircuitBreaker("user-service"),
    trainService:new CircuitBreaker("train-service"),
    paymentService:new CircuitBreaker("payment-service"),
    ticketService:new CircuitBreaker("ticket-service")
    
}
export default circuitBreaker

export const createProxy = (serviceName: string, serviceUrl: string) => 
    asyncHandler(async (req, res) => {
        // Implement proxy and circuit-breaker execution logic here
    });