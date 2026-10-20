import type { Channel } from "../../types";

type Health = {
  channel_id?: string;
  health_score?: number;
  tier?: "high" | "medium" | "unstable";
  is_disabled?: boolean;
  suppressed?: boolean;
};

function scoreRank(h?: Health) {
  if (!h) return 100;
  if (h.is_disabled) return -9999;
  // prefer not-suppressed
  const penalty = h.suppressed ? 10 : 0;
  return (h.health_score ?? 100) - penalty;
}

/**
 * Picks the best replacement channel.
 * Preference order:
 *  1) same genre (if available)
 *  2) same delivery (fallback)
 *  3) any non-disabled
 */
export function pickBestChannel(
  channels: Channel[],
  current: Channel,
  healthMap: Record<string, Health> = {}
): Channel | null {
  const currentGenre = current.genre;
  const currentDelivery = (current as any).delivery;

  const getH = (c: Channel) => healthMap[c.id] || (c as any).health || undefined;

  const isPersonal = (c: Channel) => String(c.id).startsWith("personal:");
const currentIsPersonal = isPersonal(current);

const healthyCandidates = channels
  .filter((c) => c && c.id && c.id !== current.id)
  .filter((c) => {
    const h = getH(c);
    return !h?.is_disabled && !h?.suppressed;
  });

const sameSourceCandidates = healthyCandidates.filter(
  (c) => isPersonal(c) === currentIsPersonal
);

const candidates =
  sameSourceCandidates.length > 0
    ? sameSourceCandidates
    : healthyCandidates;
    
  if (!candidates.length) return null;

  const sameGenre = currentGenre
    ? candidates.filter((c) => c.genre && c.genre === currentGenre)
    : [];

  const sameDelivery =
    !sameGenre.length && currentDelivery
      ? candidates.filter((c) => ((c as any).delivery || null) === currentDelivery)
      : [];

  const pool = sameGenre.length ? sameGenre : sameDelivery.length ? sameDelivery : candidates;

  pool.sort((a, b) => scoreRank(getH(b)) - scoreRank(getH(a)));
  return pool[0] || null;
}