import fs from 'fs';
import path from 'path';
import type { RedisClientType } from 'redis';
import type { BucketConfig, RateLimitResult } from '../../types';

        // Load Lua script once at module init 
const LUA_SCRIPT = fs.readFileSync(
  path.join(__dirname, './tokenBucket.lua'),
  'utf8'
);

/**
 * Executes the token bucket Lua script atomically on Redis.
 *
 * Uses EVALSHA if script is already cached on the Redis server,
 * falls back to EVAL on NOSCRIPT error (after server restart/flush).
 *
 * Why Lua? Redis executes scripts atomically — no other commands
 * run between HMGET and HSET, eliminating the TOCTOU race that
 * would allow bursts through under high concurrency.
 */
export class TokenBucketExecutor {
  private sha: string | null = null;

  constructor(private readonly redis: RedisClientType) {}

  
  async loadScript(): Promise<void> {
    try {
      this.sha = await this.redis.scriptLoad(LUA_SCRIPT);
    } catch (err) {
      console.error('[TokenBucket] Failed to load Lua script SHA:', err);
    }
  }

  async consume(bucketKey: string, config: BucketConfig): Promise<RateLimitResult> {
    const cost = config.cost ?? 1;
    const nowMs = Date.now();

    const args = [ String(config.capacity), String(config.refillRate), String(nowMs), String(cost),];

    let result: [number, number, number];

    try {
      result = await this.evalWithFallback(bucketKey, args);
    } catch (err) {

      console.error('[TokenBucket] Redis eval failed, failing open:', err);
      return {
        allowed: true,
        tokensRemaining: config.capacity,
        retryAfterMs: 0,
        bucketKey,
      };
    }

    const [allowed, tokensRemaining, retryAfterMs] = result;

    return {
      allowed: allowed === 1,
      tokensRemaining,
      retryAfterMs,
      bucketKey,
    };
  }

  private async evalWithFallback( key: string, args: string[]): Promise<[number, number, number]> {
    if (this.sha) {
      try {
        return await this.redis.evalSha(this.sha, {keys: [key],arguments: args,}) as [number, number, number];
      } catch (err: any) {
        // NOSCRIPT = script was flushed from Redis (restart / SCRIPT FLUSH)
        if (err?.message?.includes('NOSCRIPT')) {
          this.sha = await this.redis.scriptLoad(LUA_SCRIPT);
          return await this.redis.evalSha(this.sha, {keys: [key], arguments: args,}) as [number, number, number];
        }
        throw err;
      }
    }
    return await this.redis.eval(LUA_SCRIPT, {
      keys: [key],
      arguments: args,
    }) as [number, number, number];
  }
}