import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.js";

let supabase = null;
let warnedMissingEnv = false;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;

      if (process.env.NODE_ENV === "production") {
        logger.error("Supabase env vars missing in production");
      } else {
        logger.warn("Supabase disabled (missing env vars)");
      }
    }

    return null;
  }

  supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  logger.info("Supabase client initialized");

  return supabase;
}