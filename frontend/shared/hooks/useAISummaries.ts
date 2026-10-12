import { useSupabaseTable, saveToSupabase } from "./useSupabase";
import type { AISummary } from "../../types/supabaseTypes";

export function useAISummaries() {
  return useSupabaseTable<AISummary>("ai_summaries");
}

export async function saveAISummary(entry: AISummary) {
  return saveToSupabase<AISummary>("ai_summaries", entry);
}
