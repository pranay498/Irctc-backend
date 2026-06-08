import { createClient, RedisClientType } from "redis";
import logger from "./logger";

let _redisClient: RedisClientType | null = null;

function getRedisClient(): RedisClientType {
    if (!_redisClient) {
        const url = process.env.REDIS_URL || "redis://:irctcpass@localhost:6379";

        logger.info(`Connecting to Redis at: ${url}`);

        _redisClient = createClient({ url }) as RedisClientType;

        _redisClient.on("error", (err) =>
            logger.error("Redis Client Error", err)
        );
        _redisClient.on("connect", () =>
            logger.info("Redis Client Connected successfully")
        );
    }
    return _redisClient;
}

export const connectRedis = async (): Promise<void> => {
    const client = getRedisClient();
    if (!client.isOpen) {
        try {
            await client.connect();
            logger.info("Redis connection established");
        } catch (error) {
            logger.error("Could not connect to Redis", error);
            throw error;
        }
    }
};

export const redisClient = new Proxy({} as RedisClientType, {
    get(_target, prop) {
        return (getRedisClient() as any)[prop];
    },
});

export default getRedisClient;
