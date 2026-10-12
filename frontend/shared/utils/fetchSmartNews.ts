import { logger } from "../../web/utils/logger";/**
 
* fetchSmartNews
 * Hybrid live + cache news fetcher with category relevance
 */
export async function fetchSmartNews(category: string, lang = "en") {
  const cacheKey = `news_cache_${category}_${lang}`;
  const cached = localStorage.getItem(cacheKey);
  const cachedObj = cached ? JSON.parse(cached) : null;

  // ✅ Return cache if recent (< 30 min)
  if (cachedObj && Date.now() - cachedObj.timestamp < 30 * 60 * 1000) {
    return cachedObj.articles;
  }

  // 🔍 Free-tier API endpoints (use any available key later)
  const endpoints = [
    `https://gnews.io/api/v4/top-headlines?topic=${encodeURIComponent(category)}&lang=${lang}&apikey=YOUR_KEY`,
    `https://api.mediastack.com/v1/news?access_key=YOUR_KEY&categories=${category}&languages=${lang}`,
    `https://newsdata.io/api/1/news?apikey=YOUR_KEY&category=${category}&language=${lang}`,
  ];

  let articles: any[] = [];

  for (const url of endpoints) {
    try {
      
  const res = await fetch(url, {
    method: "GET",
  });

  const data = await res.json().catch(() => null);

  if (res.ok) {
    articles =
      Array.isArray(data?.articles)
        ? data.articles
        : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
        ? data.data
        : [];

    break;
  }

  logger.warn("News endpoint rejected:", res.status, url);
} catch (err) {
  logger.warn("News endpoint failed:", url, err);
  // continue to next endpoint
}
  }

  // 🔧 Cache new results (only ~25 items)
  const slice = articles.slice(0, 25);
  localStorage.setItem(
    cacheKey,
    JSON.stringify({ timestamp: Date.now(), articles: slice })
  );

  return slice;
}
