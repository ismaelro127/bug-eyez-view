import { useEffect, useState } from "react";
import { fetchSmartNews } from "../utils/fetchSmartNews";

export function useSmartNews(category: string, lang = "en") {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      setLoading(true);
      const articles = await fetchSmartNews(category, lang);
      if (active) setNews(articles);
      setLoading(false);
    }

    loadNews();
    const interval = setInterval(loadNews, 10 * 60 * 1000); // refresh every 10 min
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [category, lang]);

  return { news, loading };
}
