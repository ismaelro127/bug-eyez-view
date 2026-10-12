import { getSupabase } from "../lib/supabase.js";
import { logger } from "../utils/logger.js";

const BUFFER_LIMIT = 1000;
const FLUSH_INTERVAL_MS = 2000;
const MAX_RETRY = 2;

let buffer: any[] = [];
let flushing = false;

/**
 * Safe, buffered event recorder
 */
export function recordEvent({
  event_type,
  channel_id = null,
  source = null,
  payload = {},
  user_id = null,
  session_id = null,
}: {
  event_type: string;
  channel_id?: string | null;
  source?: string | null;
  payload?: any;
  user_id?: string | null;
  session_id?: string | null;
}) {
  if (!event_type) return;

  // Memory protection
  if (buffer.length >= BUFFER_LIMIT) {
    logger.warn(
      { dropped_event: event_type },
      "Event buffer overflow — trimming oldest"
    );
    buffer = buffer.slice(-Math.floor(BUFFER_LIMIT / 2));
  }

  buffer.push({
    event_type,
    channel_id,
    source,
    payload,
    user_id,
    session_id,
    created_at: new Date().toISOString(),
  });
}

/**
 * Flush buffered events to Supabase
 */
async function flush(retry = 0): Promise<void> {
  if (flushing) return;
  if (!buffer.length) return;

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn("Supabase unavailable — skipping event flush");
    return;
  }

  flushing = true;

  const batch = buffer.splice(0, BUFFER_LIMIT);

  try {
    const { error } = await supabase
      .from("app_events")
      .insert(batch);

    if (error) {
      logger.error(
        { error: error.message, retry },
        "Supabase batch insert failed"
      );

      if (retry < MAX_RETRY) {
        buffer.unshift(...batch);
        return flush(retry + 1);
      }
    }
  } catch (err: any) {
    logger.error(
      { err: err?.message, retry },
      "Event flush exception"
    );

    if (retry < MAX_RETRY) {
      buffer.unshift(...batch);
      return flush(retry + 1);
    }
  } finally {
    flushing = false;
  }
}

// Periodic flush
setInterval(() => {
  flush().catch((err) => {
    logger.error({ err }, "Scheduled flush failed");
  });
}, FLUSH_INTERVAL_MS);

// Graceful shutdown
async function shutdownFlush() {
  if (!buffer.length) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from("app_events").insert(buffer);
    logger.info({ count: buffer.length }, "Final event flush completed");
  } catch (err) {
    logger.error({ err }, "Final event flush failed");
  }
}

process.on("beforeExit", shutdownFlush);
process.on("SIGTERM", shutdownFlush);
process.on("SIGINT", shutdownFlush);