/**
 * Dead-Letter Queue (DLQ) handler for Kafka consumers.
 *
 * Wraps eachMessage processing with retry tracking. After DLQ_MAX_RETRIES
 * consecutive failures the message is forwarded to a per-service DLQ topic
 * and the consumer moves on instead of blocking forever.
 *
 * Usage (in any consumer):
 *   import { withDLQ } from '../../../../shared/utils/dlqHandler';
 *   await consumer.run({ eachMessage: withDLQ(producer, dlqTopic, logger, handler) });
 */

import { Producer, EachMessagePayload } from 'kafkajs';
import { Logger } from 'winston';
import { DLQ_MAX_RETRIES } from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DLQHandlerPayload<T = unknown> {
  topic: string;
  partition: number;
  message: EachMessagePayload['message'];
  parsedValue: T;
}

export type DLQHandler<T = unknown> = (payload: DLQHandlerPayload<T>) => Promise<void>;

// ─── Main Wrapper ─────────────────────────────────────────────────────────────

/**
 * @param producer  - Kafka producer (for sending to DLQ)
 * @param dlqTopic  - DLQ topic name (e.g. KAFKA_TOPICS.DLQ_BOOKING)
 * @param logger    - Winston logger
 * @param handler   - async ({ topic, partition, message, parsedValue }) => void
 * @returns eachMessage-compatible handler
 */
export function withDLQ<T = unknown>(
  producer: Producer,
  dlqTopic: string,
  logger: Logger,
  handler: DLQHandler<T>
): (payload: EachMessagePayload) => Promise<void> {
  // In-memory retry tracker: key = `${topic}:${partition}:${offset}` → attempt count
  const retryMap = new Map<string, number>();

  return async ({ topic, partition, message }: EachMessagePayload): Promise<void> => {
    const msgKey = `${topic}:${partition}:${message.offset}`;
    const attempt = (retryMap.get(msgKey) ?? 0) + 1;
    retryMap.set(msgKey, attempt);

    let parsedValue: T;

    try {
      parsedValue = JSON.parse(message.value!.toString()) as T;
    } catch (parseErr) {
      // Completely unparseable — send to DLQ immediately
      logger.error(`Unparseable message on ${topic}, sending to DLQ`, {
        partition,
        offset: message.offset,
        error: (parseErr as Error).message,
      });
      await sendToDLQ(producer, dlqTopic, topic, partition, message, parseErr as Error, logger);
      retryMap.delete(msgKey);
      return;
    }

    try {
      await handler({ topic, partition, message, parsedValue });
      // Success — clean up
      retryMap.delete(msgKey);
    } catch (error) {
      logger.error(`Error processing ${topic} (attempt ${attempt}/${DLQ_MAX_RETRIES})`, {
        error: (error as Error).message,
        partition,
        offset: message.offset,
      });

      if (attempt >= DLQ_MAX_RETRIES) {
        logger.error(`Max retries exceeded for ${topic}, sending to DLQ`, {
          partition,
          offset: message.offset,
        });
        await sendToDLQ(producer, dlqTopic, topic, partition, message, error as Error, logger);
        retryMap.delete(msgKey);
      } else {
        // Re-throw so KafkaJS retries (it will re-deliver the same message)
        throw error;
      }
    }
  };
}

// ─── DLQ Publisher ────────────────────────────────────────────────────────────

async function sendToDLQ(
  producer: Producer,
  dlqTopic: string,
  originalTopic: string,
  partition: number,
  message: EachMessagePayload['message'],
  error: Error,
  logger: Logger
): Promise<void> {
  try {
    await producer.send({
      topic: dlqTopic,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers: {
            ...message.headers,
            'dlq-original-topic': originalTopic,
            'dlq-original-partition': String(partition),
            'dlq-original-offset': message.offset,
            'dlq-error': error.message,
            'dlq-timestamp': new Date().toISOString(),
          },
        },
      ],
    });
    logger.info(`Message sent to DLQ: ${dlqTopic}`, {
      originalTopic,
      partition,
      offset: message.offset,
    });
  } catch (dlqError) {
    // If even the DLQ publish fails, log and move on — don't block the consumer forever
    logger.error(`Failed to send message to DLQ ${dlqTopic}`, {
      error: (dlqError as Error).message,
      originalTopic,
      partition,
      offset: message.offset,
    });
  }
}