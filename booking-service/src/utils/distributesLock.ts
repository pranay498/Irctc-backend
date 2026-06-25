import { redisClient } from "../config/redis";
import logger from "../config/logger";

const ACQUIRE_SCRIPT = `
    for i = 1, #KEYS do
        if redis.call("EXISTS", KEYS[i]) == 1 then
            return 0
        end
    end
    for i = 1, #KEYS do
        redis.call("SET", KEYS[i], ARGV[1], "EX", tonumber(ARGV[2]))
    end
    return 1
`;

const RELEASE_SCRIPT = `
    local releasedCount = 0
    for i = 1, #KEYS do
        if redis.call("GET", KEYS[i]) == ARGV[1] then
            if redis.call("DEL", KEYS[i]) == 1 then
                releasedCount = releasedCount + 1
            end
        end
    end
    return releasedCount
`;

export function buildLockKeys(scheduleId: string, seatIds: string[], fromSeq?: number, toSeq?: number): string[] {
    const keys: string[] = [];
    for (const seatId of seatIds) {
        if (fromSeq !== undefined && toSeq !== undefined && !isNaN(fromSeq) && !isNaN(toSeq)) {
            for (let i = fromSeq; i < toSeq; i++) {
                keys.push(`lock:schedule:${scheduleId}:seat:${seatId}:segment:${i}`);
            }
        } else {
            // Safe fallback to lock the seat globally across segments 1 to 100
            for (let i = 1; i <= 100; i++) {
                keys.push(`lock:schedule:${scheduleId}:seat:${seatId}:segment:${i}`);
            }
        }
    }
    return keys;
}

export async function acquireSeatLocks(scheduleId: string, seatIds: string[], bookingId: string, ttlSeconds: number, fromSeq?: number, toSeq?: number): Promise<{ acquired: boolean; lockValue: string | null }> {
    const keys = buildLockKeys(scheduleId, seatIds, fromSeq, toSeq);
    const lockValue = `${bookingId}:${Date.now()}`;

    try {
        const result = await redisClient.eval(ACQUIRE_SCRIPT, {
            keys,
            arguments: [lockValue, String(ttlSeconds)]
        });

        if (result === 1) {
            logger.info(`Distributed locks acquired for booking ${bookingId}`, {
                scheduleId,
                seatCount: seatIds.length,
                ttlSeconds,
            });
            return { acquired: true, lockValue };
        }

        logger.info(`Failed to acquire locks — seats already locked`, {
            scheduleId,
            bookingId,
        });
        return { acquired: false, lockValue: null };

    } catch (error: any) {
        logger.error('Error acquiring distributed locks', {
            error: error.message,
            scheduleId,
            bookingId,
        });
        // Fail closed: reject the booking attempt rather than bypassing the lock.
        // Allowing duplicate bookings is far worse than a temporary service degradation.
        return { acquired: false, lockValue: null };
    }
}

export async function releaseSeatLocks(scheduleId: string, seatIds: string[], lockValue: string | null, fromSeq?: number, toSeq?: number): Promise<void> {
    if (!lockValue) return;
    const keys = buildLockKeys(scheduleId, seatIds, fromSeq, toSeq);

    try {
        const released = await redisClient.eval(RELEASE_SCRIPT, {
            keys,
            arguments: [lockValue]
        });
        logger.info(`Released ${released} distributed lock(s)`, { scheduleId });
    } catch (error: any) {
        // Non-critical: locks will expire via TTL
        logger.error('Error releasing distributed locks', {
            error: error.message,
            scheduleId,
        });
    }
}
