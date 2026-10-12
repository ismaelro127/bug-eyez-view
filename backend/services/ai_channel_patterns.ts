import { getSupabase } from "../lib/supabase";
import { logger } from "../utils/logger";

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
  try {
    const supabase = getSupabase();

    if (!supabase) {
      logger.warn(
        { channel_id: input.channel_id },
        "Supabase not initialized — pattern not recorded"
      );
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
        {
          channel_id: input.channel_id,
          error: error.message,
        },
        "AI pattern insert failed"
      );
    }
  } catch (err) {
    logger.error(
      {
        err,
        channel_id: input.channel_id,
      },
      "Unexpected failure in recordChannelPattern"
    );
  }
}