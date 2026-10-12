import { logger } from "../utils/logger";
import { apiFetch } from "../../lib/apiFetch";

export type EventType =
  | "channel-selected"
  | "channel-play-started"
  | "channel-play-stopped"
  | "channel-play-failed"
  | "ad-rewarded";

export async function emitEvent(
  type: EventType,
  payload: Record<string, any>
) {
  if (typeof window === "undefined") return;

  try {
    const res = await apiFetch(
      `/api/events/${type}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      logger.warn(
        "Event emit rejected:",
        type,
        res.status
      );
    }
  } catch (err) {
    logger.warn(
      "Event emit failed:",
      type,
      err
    );
  }
}