import { EPGEntry } from "../../types";

const WINDOW_HOURS = 24;

function parseXmlTvUtc(value?: string | null): number {
  if (!value) return NaN;

  // Example: "20260608221500 +0000"
  const clean = value.split(" ")[0];

  if (!/^\d{14}$/.test(clean)) return NaN;

  const year = Number(clean.slice(0, 4));
  const month = Number(clean.slice(4, 6)) - 1;
  const day = Number(clean.slice(6, 8));
  const hour = Number(clean.slice(8, 10));
  const minute = Number(clean.slice(10, 12));
  const second = Number(clean.slice(12, 14));

  return Date.UTC(year, month, day, hour, minute, second);
}

function parseProgramTs(p: any, key: "start" | "stop") {
  const iso =
    key === "start"
      ? p.start_utc ?? null
      : p.stop_utc ?? null;

  const xml =
    key === "start"
      ? p.start_utc_xml ?? null
      : p.stop_utc_xml ?? null;

  const isoTs = iso ? Date.parse(iso) : NaN;
  if (!Number.isNaN(isoTs)) return isoTs;

  return parseXmlTvUtc(xml);
}

function isFillerProgram(p: any) {
  const title = String(p.title || "").trim().toLowerCase();
  const desc = String(p.description || "").trim().toLowerCase();

  const durationMin = Math.round((p._endTs - p._startTs) / 60000);

  // France 24 creates lots of 1-minute "Introduction" blocks.
  // These make the EPG ugly but are not useful to users.
  if (durationMin <= 2 && title === "introduction") {
    return true;
  }

  // Extra safety for obvious filler labels if they are tiny.
  if (
    durationMin <= 2 &&
    (title === "intro" ||
      title === "opening" ||
      title === "programme intro" ||
      desc.includes("introduction – programme details unavailable"))
  ) {
    return true;
  }

  return false;
}

export function normalizeEPG(
  channelId: string,
  list: EPGEntry[]
): EPGEntry[] {
  const nowTs = Date.now();

  const parsed = list
    .map((p: any) => {
      const startTs = parseProgramTs(p, "start");
      const endTs = parseProgramTs(p, "stop");

      return {
        ...p,
        _startTs: startTs,
        _endTs: endTs,
      };
    })
    .filter((p) => {
      if (Number.isNaN(p._startTs) || Number.isNaN(p._endTs)) return false;
      if (p._endTs <= p._startTs) return false;

      // Keep recent + upcoming guide data.
      if (p._endTs <= nowTs - 60 * 60 * 1000) return false;

      // Remove tiny filler blocks.
      if (isFillerProgram(p)) return false;

      return true;
    })
    .sort((a, b) => a._startTs - b._startTs);

  // Fix overlaps after removing filler blocks.
  const cleaned: any[] = [];

  for (const item of parsed) {
    const prev = cleaned[cleaned.length - 1];

    if (prev && item._startTs < prev._endTs) {
      // If this item is mostly swallowed by the previous one, skip it.
      if (item._endTs <= prev._endTs) {
        continue;
      }

      // Otherwise clamp it to start after previous item.
      item._startTs = prev._endTs;
    }

    const durationMin = Math.round((item._endTs - item._startTs) / 60000);

    // Drop useless leftovers created by overlap clamping.
    if (durationMin <= 0) continue;

    cleaned.push(item);
  }

  // Fill meaningful schedule gaps so rows do not look broken.
// Small gaps are ignored so removed 1-minute filler blocks do not come back.
const GAP_FILL_MINUTES = 10;
const withGaps: any[] = [];

for (const item of cleaned) {
  const prev = withGaps[withGaps.length - 1];

  if (prev) {
    const gapMin = Math.round((item._startTs - prev._endTs) / 60000);

    if (gapMin >= GAP_FILL_MINUTES) {
      withGaps.push({
        ...prev,
        title:
          channelId === "al_jazeera_english"
            ? "Al Jazeera Live"
            : "Live Programming",
        description: "Live programming continues.",
        category: prev.category || "Live",
        genre: prev.genre || "Live",
        tags: prev.tags || ["live"],
        _startTs: prev._endTs,
        _endTs: item._startTs,
        isFallback: true,
        is_live: true,
      });
    }
  }

  withGaps.push(item);
}

  return withGaps.map((p) => {
    const startLocal = new Date(p._startTs);
    const endLocal = new Date(p._endTs);

    const startMin = startLocal.getHours() * 60 + startLocal.getMinutes();
    let endMin = endLocal.getHours() * 60 + endLocal.getMinutes();

    if (endMin < startMin) {
      endMin += 1440;
    }

    return {
      ...p,
      channel_id: channelId,

      start_utc: new Date(p._startTs).toISOString(),
      stop_utc: new Date(p._endTs).toISOString(),

      start_min: startMin,
      end_min: endMin,
      duration_min: Math.max(1, endMin - startMin),

      isFallback: false,
    };
  });
}