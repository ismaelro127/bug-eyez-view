/**
 * fetchProgramInfo
 * Searches TMDB for shows or films, returns details + poster
 */
export async function fetchProgramInfo(title: string) {
  const key = `program_${title.toLowerCase().replace(/\s+/g, "_")}`;
  const cached = localStorage.getItem(key);
  const cachedObj = cached ? JSON.parse(cached) : null;

  if (cachedObj && Date.now() - cachedObj.timestamp < 7 * 24 * 60 * 60 * 1000)
    return cachedObj.data;

  try {
    const res = await fetch(
  `/api/tmdb/search?query=${encodeURIComponent(title)}`,
  {
    method: "GET",
    credentials: "include",
  }
);

const data = await res.json().catch(() => null);

if (!res.ok) {
  throw new Error(data?.error || "No data");
}

const first = data?.results?.[0];

if (!first) {
  throw new Error("No result");
}

const info = {
  title: first.title || first.name || title,
  overview: first.overview || "",
  release: first.release_date || first.first_air_date || "",
  poster: first.poster_path
    ? `https://image.tmdb.org/t/p/w300${first.poster_path}`
    : null,
  type: first.media_type,
};
    localStorage.setItem(
      key,
      JSON.stringify({ timestamp: Date.now(), data: info })
    );
    return info;
  } catch {
    return { title, overview: "No details found", poster: null, type: "unknown" };
  }
}
