import dotenv from "dotenv";
dotenv.config();

export const env = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  ai: {
    openai: process.env.OPENAI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    huggingface: process.env.HUGGINGFACE_API_KEY,
    coherent: process.env.COHERENT_API_KEY,
  },
  news: {
    gnews: process.env.GNEWS_API_KEY,
    newsapi: process.env.NEWSAPI_KEY,
    worldnews: process.env.WORLD_NEWS_API_KEY,
    nytimes: process.env.NEW_YORK_TIMES_API_KEY,
    newsdata: process.env.NEWSDATA_API_KEY,
    tmdb: process.env.TMDB_API_KEY,
  },
};
