import { EventType, EventPayloadMap } from "./eventTypes.js";
import { logger } from "./utils/logger.d.js";
/**
 * In-memory async hook registry
 * Phase 1: Local event bus
 * Phase 2: Can swap for Redis / Kafka / NATS
 */

type EventHandler<T extends EventType = EventType> = (
  payload: EventPayloadMap[T]
) => Promise<void> | void;

const handlers = new Map<EventType, Set<EventHandler>>();

const MAX_QUEUE = 10000;
let queued = 0;

/**
 * Register a handler for an event type
 */
export function onEvent<T extends EventType>(
  type: T,
  handler: EventHandler<T>
) {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler as EventHandler);
}

/**
 * Remove handler (optional)
 */
export function offEvent<T extends EventType>(
  type: T,
  handler: EventHandler<T>
) {
  handlers.get(type)?.delete(handler as EventHandler);
}

/**
 * Emit event safely (never throws)
 */
export function emitEvent<T extends EventType>(
  type: T,
  payload: EventPayloadMap[T]
): void {
  try {
    if (queued > MAX_QUEUE) {
      logger.warn("⚠ Event queue overflow, dropping:", type);
      return;
    }

    queued++;

    // Run async without blocking caller
    setImmediate(async () => {
      try {
        const eventHandlers = handlers.get(type);
        if (!eventHandlers?.size) return;

        for (const handler of eventHandlers) {
          try {
            await handler(payload);
          } catch (err) {
            logger.error("⚠ Event handler error:", type, err);
          }
        }
      } finally {
        queued--;
      }
    });
  } catch {
    // absolutely never crash app
  }
}
