import { useEffect, useState } from "react";
import type { CaptionCapabilities } from "../types";
import { apiFetch } from "../../lib/apiFetch";

const DEFAULT: CaptionCapabilities = {
  native: false,
  ai_live: false,
  ai_on_demand: false,
};

export function useCaptionCapabilities() {
  const [caps, setCaps] = useState<CaptionCapabilities>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiFetch("/api/captions/capabilities", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const data = (await res.json().catch(() => null)) as
          | Partial<CaptionCapabilities>
          | null;

        if (!res.ok) {
          throw new Error(`capabilities http ${res.status}`);
        }

        if (!alive) return;

        setCaps({
          native: Boolean(data?.native),
          ai_live: Boolean(data?.ai_live),
          ai_on_demand: Boolean(data?.ai_on_demand),
        });
      } catch {
        // security default: disable everything if server is unreachable
        if (alive) setCaps(DEFAULT);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { caps, loading };
}