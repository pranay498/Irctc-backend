import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ICircuitBreaker } from ".././types";
import { config } from "../config";
import logger from "../config/logger";

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

class CircuitBreaker implements ICircuitBreaker {
  public serviceName: string;
  public failureCount: number;
  public threshold: number;
  public timeout: number;
  public state: string;
  public nextAttempt: Date;

  // ─── Constructor ────────────────────────────────────────────────────────────
  constructor(
    serviceName: string,
    threshold = Number(config.CIRCUIT_BREAKER_THRESHOLD),
    timeout = Number(config.CIRCUIT_BREAKER_FAILURE_TIMEOUT),
  ) {
    this.serviceName = serviceName;
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = "closed";
    this.nextAttempt = new Date();

    
  }

  // FIX: execute() now accepts (req, res, fn) — fn is the actual axios call
  async execute(req: Request, res: Response, fn: () => Promise<any>) {
    if (this.state === "open") {
      if (Date.now() < this.nextAttempt.getTime()) {
        throw new Error(`${this.serviceName} service unavailable`);
      }
      this.state = "half-open";
      logger.info(`Circuit is half-open: ${this.serviceName}`);
    }

    try {
      const result = await fn(); // FIX: call fn(), not request()
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === "half-open") 
        this.state = "closed";
    logger.info(`Circuit closed: ${this.serviceName}`);
  }


  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = "open";
      this.nextAttempt = new Date(Date.now() + this.timeout);
      logger.error(`Circuit open: ${this.serviceName}`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.threshold,
      timeout: this.timeout,
      nextAttempt: this.nextAttempt,
    };
  }
}



export const circuitBreakers = {
  "user-service":    new CircuitBreaker("user-service"),
  "train-service":   new CircuitBreaker("train-service"),
  "payment-service": new CircuitBreaker("payment-service"),
  "ticket-service":  new CircuitBreaker("ticket-service"),
};

export default circuitBreakers;


async function forwardRequest( serviceUrl: string, path: string,body: any,method: string,headers: Record<string, any>, query: Record<string, any>,breaker: CircuitBreaker,) {
  const url = `${serviceUrl}${path}`;

 
  const requestConfig: Record<string, any> = {
    method,
    url,
    timeout: config.SERVICE_REQUEST_TIMEOUT,
    headers: {         
      ...headers,
      host: undefined,
      "content-length": undefined,
    },
    validateStatus: (status: number) => status < 500,
    maxRedirects: 5,
  };

  if (method.toUpperCase() !== "GET" && body) {
    requestConfig.data = body;
  }

  if (method.toUpperCase() === "GET") {
    requestConfig.params = query; 
  }

  logger.info(`Forwarding ${method} ${url}`, {
    headers: requestConfig.headers,
    ...(body && { body }),
  });


  const response = await breaker.execute(
    {} as Request,
    {} as Response,
    () => axios(requestConfig),
  );

  logger.debug(`Response from ${breaker.serviceName}`, response.data);

  return response;
}

// ─── Create Proxy ─────────────────────────────────────────────────────────────

export const createProxy = (serviceName: string, serviceUrl: string) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

 
    const breaker = circuitBreakers[serviceName as keyof typeof circuitBreakers];
    if (!breaker) {
      return next(new Error(`No circuit breaker registered for: ${serviceName}`));
    }

    const pathParts = req.path.split("/").filter(Boolean);
    pathParts.shift();
    const servicePath = "/" + pathParts.join("/");

    const queryString = req.url.includes("?")
      ? req.url.substring(req.url.indexOf("?"))
      : "";

    const result = await forwardRequest(
      serviceUrl,
      servicePath + queryString,
      req.body,
      req.method,
      req.headers as Record<string, any>,
      req.query as Record<string, any>,
      breaker,
    );

    const excludeHeaders = ["connection", "keep-alive", "transfer-encoding", "host"];

    Object.keys(result.headers).forEach((key) => {
      if (!excludeHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, result.headers[key]);
      }
    });

    res.status(result.status);
    return res.send(result.data);
  });