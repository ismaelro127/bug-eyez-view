// FRONTEND: /frontend/components/NewsCenter/useNewsFeed.ts
import { useCallback, useEffect, useRef, useState } from "react";

export type NewsItem = {
  title: string;
  description?: string;
  url?: string;
  urlToImage?: string;
  source?: { name?: string };
  category?: string;
  fetched_at?: string;
  tags?: string[];
  sentiment?: "positive" | "neutral" | "negative";
};

type ApiResponse = { count: number; results: NewsItem[] ; error?: string; }; 


export function useNewsFeed(initialCategory = "all") {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const lastFetchKey = useRef<string>(""); // prevents duplicate calls within window
  const lastFetchAt = useRef<number>(0);
const url = new URL("/api/news/search", window.location.origin);

if (query) {
  url.searchParams.set("query", query);
}

if (category && category !== "All") {
  url.searchParams.set("category", category);
}

const fetchNews = useCallback(async (opts?: { force?: boolean }) => {
  const key = `${query}|${category}`;
  const now = Date.now();

  if (
    !opts?.force &&
    key === lastFetchKey.current &&
    now - lastFetchAt.current < 60000
  ) {
    return;
  }

  setLoading(true);
  setLastError(null);

  try {
    const url = new URL("/api/news/search", window.location.origin);

    if (query) {
      url.searchParams.set("query", query);
    }

    if (category && category !== "All") {
      url.searchParams.set("category", category);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
    });

    const data: ApiResponse | null = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    setItems(data?.results || []);
    lastFetchKey.current = key;
    lastFetchAt.current = now;
  } catch (e: any) {
    setLastError(e?.message || "Failed to load news");
  } finally {
    setLoading(false);
  }
}, [query, category]);

  // debounce query typing
  useEffect(() => {
    const t = setTimeout(() => fetchNews(), 650);
    return () => clearTimeout(t);
  }, [query, category, fetchNews]);

  // boot
  useEffect(() => { fetchNews({ force: true }); }, []); // first load

  return {
    items, query, setQuery, category, setCategory,
    loading, lastError, refresh: () => fetchNews({ force: true })
  };
}
