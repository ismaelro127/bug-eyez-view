import { useSupabaseTable, saveToSupabase } from "./useSupabase";
import type { EPGEntry } from "../../types/supabaseTypes";

export function useEPG() {
  return useSupabaseTable<EPGEntry>("epg_data");
}

export async function saveEPG(entry: EPGEntry) {
  return saveToSupabase<EPGEntry>("epg_data", entry);
}
