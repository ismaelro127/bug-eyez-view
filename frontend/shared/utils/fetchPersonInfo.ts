/**
 * fetchPersonInfo
 * Retrieves short bio & known works from Wikipedia (free) + caches locally.
 */
export async function fetchPersonInfo(name: string) {
  const key = `person_${name.toLowerCase().replace(/\s+/g, "_")}`;
  const cached = localStorage.getItem(key);
  const cachedObj = cached ? JSON.parse(cached) : null;

  if (cachedObj && Date.now() - cachedObj.timestamp < 7 * 24 * 60 * 60 * 1000) {
    return cachedObj.data;
  }

  try {
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    name.trim()
  )}`;

  const res = await fetch(wikiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.detail || "No summary found");
  }

  const info = {
    name,
    bio: data?.extract || "No data available.",
    thumbnail: data?.thumbnail?.source || null,
    url: data?.content_urls?.desktop?.page || null,
  };

  localStorage.setItem(
    key,
    JSON.stringify({
      timestamp: Date.now(),
      data: info,
    })
  );

  return info;
} catch {
  return {
    name,
    bio: "No data available.",
    thumbnail: null,
    url: null,
  };
}
}
