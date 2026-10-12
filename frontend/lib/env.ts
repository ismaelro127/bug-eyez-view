export const env = {
  openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  openrouter: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
  huggingface: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
  coherent: process.env.NEXT_PUBLIC_COHERENT_API_KEY,
  gnews: process.env.NEXT_PUBLIC_GNEWS_API_KEY,
  tmdb: process.env.NEXT_PUBLIC_TMDB_API_KEY,
  newsapi: process.env.NEXT_PUBLIC_NEWSAPI_KEY,
  worldnews: process.env.NEXT_PUBLIC_WORLD_NEWS_API_KEY,
  nytimes: process.env.NEXT_PUBLIC_NEW_YORK_TIMES_API_KEY,
  newsdata: process.env.NEXT_PUBLIC_NEWSDATA_API_KEY,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  },
};
