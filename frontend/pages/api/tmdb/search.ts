import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const query = String(req.query.query || "").trim();

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY missing" });
    }

    const tmdbUrl = new URL("https://api.themoviedb.org/3/search/multi");
    tmdbUrl.searchParams.set("query", query);
    tmdbUrl.searchParams.set("api_key", apiKey);

    const tmdbRes = await fetch(tmdbUrl.toString());
    const data = await tmdbRes.json().catch(() => null);

    if (!tmdbRes.ok) {
      return res.status(tmdbRes.status).json({
        error: data?.status_message || "TMDB request failed",
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "TMDB search failed" });
  }
}