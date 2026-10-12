// utils/epgTime.ts
// ------------------------------------------------------------
// 🔥 Universal EPG Time Normalizer for Bug Eyez View
// Supports ALL formats, accepts 1 or 2 args in formatEPGTime()
// ------------------------------------------------------------

export interface HasEPGTime {
  time_local?: string;
  start_utc?: string;
  stop_utc?: string;
  start_utc_xml?: string;
  stop_utc_xml?: string;
}

/* ------------------------------------------------------------
   Convert ANY timestamps → Date | null
------------------------------------------------------------- */
export function parseEPGDate(
  start_utc?: string,
  start_utc_xml?: string,
  time_local?: string
): Date | null {
  // 1) ISO UTC
  if (start_utc) {
    const d = new Date(start_utc);
    if (!isNaN(d.getTime())) return d;
  }

  // 2) XMLTV “20251205231000 +0000”
  if (start_utc_xml) {
    const m = start_utc_xml.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (m) {
      const [, y, mo, da, h, min] = m.map(Number);
      const d = new Date(Date.UTC(y, mo - 1, da, h, min));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3) HH:MM fallback
  if (time_local) {
    const [h, m] = time_local.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
  }

  return null;
}

/* ------------------------------------------------------------
   Convert ANY timestamp → minutes since midnight
------------------------------------------------------------- */
export function epgMinutes(p: HasEPGTime): number {
  const d = parseEPGDate(p.start_utc, p.start_utc_xml, p.time_local);
  if (!d) return -1;
  return d.getHours() * 60 + d.getMinutes();
}

/* ------------------------------------------------------------
   UI Time Formatting
   Accepts:
     • formatEPGTime(epgItem)
     • formatEPGTime("2025-12-06T00:00:00Z", epgItem)
------------------------------------------------------------- */
export function formatEPGTime(
  arg1: string | HasEPGTime,
  arg2?: HasEPGTime
): string {
  // Case A: formatEPGTime(epgItem)
  if (typeof arg1 === "object") {
    const p = arg1;

    // Use time_local if available
    if (p.time_local) return p.time_local;

    const d = parseEPGDate(p.start_utc, p.start_utc_xml, p.time_local);
    if (!d) return "--:--";

    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Case B: formatEPGTime(start_utc, epgItem)
  const p = arg2;
  if (!p) return "--:--";

  if (p.time_local) return p.time_local;

  const d = parseEPGDate(arg1, p.start_utc_xml, p.time_local);
  if (!d) return "--:--";

  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------
   Sort EPG items chronologically
------------------------------------------------------------- */
export function sortByEPGTime(list: HasEPGTime[]): HasEPGTime[] {
  return [...list].sort((a, b) => epgMinutes(a) - epgMinutes(b));
}
