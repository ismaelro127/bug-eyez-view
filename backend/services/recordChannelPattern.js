import { getSupabase } from "../lib/supabase.js";
import { logger } from "../utils/logger.js";

let warnedSupabaseDisabled = false;

export async function recordChannelPattern({
  channelId,
  channelName,
  programTitle,
  startTime,
  endTime,
  source = "unknown",
  deliveryType,
  programType,
  region,
  endedReason,
}) {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      if (!warnedSupabaseDisabled) {
        warnedSupabaseDisabled = true;

        logger.warn(
          "Supabase not initialized. Channel pattern recording will be skipped."
        );
      }

      return {
        ok: false,
        skipped: true,
        reason: "SUPABASE_NOT_INITIALIZED",
      };
    }

    const { error } = await supabase
      .from("ai_channel_patterns")
      .insert({
        channel_id: channelId,
        channel_name: channelName,
        program_title: programTitle,
        start_time: startTime,
        end_time: endTime,
        source,
        delivery_type: deliveryType,
        program_type: programType,
        region,
        ended_reason: endedReason,
      });

    if (error) {
      logger.error(
        {
          channelId,
          error: error.message,
        },
        "Pattern insert failed"
      );

      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: true,
    };
  } catch (err) {
    logger.error(
      {
        err: {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        },
        channelId,
      },
      "Unexpected failure in recordChannelPattern"
    );

    return {
      ok: false,
      error: err.message,
    };
  }
}