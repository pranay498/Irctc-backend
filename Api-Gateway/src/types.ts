import type { Request } from 'express';

export interface ICircuitBreaker {
    serviceName: string;
    failureCount: number;
    threshold: number;
    
}
export interface BucketConfig {
  capacity: number;

  refillRate: number;

  cost?: number;
}

export interface RouteRateLimitConfig {
  /** Exact path string or RegExp — matched against req.path */
  route: string | RegExp;
  /** HTTP methods this rule applies to. Omit / use ['*'] for all. */
  methods?: string[];
  bucket: BucketConfig;
}

export interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  retryAfterMs: number;
  bucketKey: string;
}

export interface RateLimiterOptions {
  /**
   * Route-specific bucket overrides.
   * Checked in order — first match wins.
   */
  routeConfigs: RouteRateLimitConfig[];
  /** Fallback bucket when no route config matches */
  defaultBucket: BucketConfig;
  /**
   * Redis key prefix.
   * Final key: "{prefix}:{METHOD}:{route}:{identity}"
   * Default: "rl"
   */
  keyPrefix?: string;
  /**
   * Extract a stable identity string from the request.
   * Return null to fall back to IP address.
   * Typically: decode JWT and return userId.
   */
  identityExtractor?: (req: Request) => string | null;
 
  onLimitReached?: (bucketKey: string, req: Request) => void;
  /**
   * IPs that bypass rate limiting entirely.
   * Use for internal health checkers, trusted upstream proxies.
   */
  skipList?: string[];
}