import { useEffect, useState, useCallback } from "react";
import { Channel } from "../../types";
import { logger } from "../../web/utils/logger";
import { apiFetch } from "../../lib/apiFetch";


export default function useChannels(token: string | null) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!token) return;

    try {
      const res = await apiFetch("/api/channels", {
  method: "GET",
});

     if (res.status === 401 || res.status === 403) {
  return;
}
      if (res.status === 429) {
        console.warn("Rate limited — retrying shortly");
        setTimeout(fetchChannels, 2000);
        return;
      }

      const data = await res.json();

if (!Array.isArray(data)) {
  logger.warn("Invalid channel response:", data);
  return;
}

const normalized = data.map((ch: any) => ({
  ...ch,
  logo: ch.logo || "",
  genre: ch.genre || ch.category || "General",
  epgId: ch.epgId || ch.id,
  useStrict: ch.useStrict || false,
}));
      setChannels(normalized);
    } catch (err) {
      console.error("useChannels error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return { channels, loading, refresh: fetchChannels };
}