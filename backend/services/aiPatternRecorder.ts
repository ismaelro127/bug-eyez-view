// backend/services/aiPatternRecorder.ts
import { getSupabase } from "../lib/supabase.js";
import { logger } from "../utils/logger.js";

type PatternInput = {
  channel_id: string;
  source: string;
  delivery?: string;
  stream_id?: string;

  start_time_min?: number;
  end_time_min?: number;
  duration_min?: number;

  category?: string;
  confidence?: number;

  is_live: boolean;
  went_offline?: boolean;
  stable?: boolean;

  session_hash: string;
  notes?: string;
};

export async function recordChannelPattern(input: PatternInput) {
const supabase = getSupabase();
if (!supabase) {
  logger.warn("Supabase not initialized — pattern not recorded");
  return;
}
  const { error } = await supabase
    .from("ai_channel_patterns")
    .insert({
      ...input,
      observed_at: new Date().toISOString(),
    });

  if (error) {
  logger.warn(
    { error: error.message, channel_id: input.channel_id },
    "AI pattern insert failed"
  );
}
}
