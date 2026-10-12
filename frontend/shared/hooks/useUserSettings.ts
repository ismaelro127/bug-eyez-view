import { useSupabaseTable, saveToSupabase } from "./useSupabase";
import type { UserSettings } from "../../types/supabaseTypes";

export function useUserSettings() {
  return useSupabaseTable<UserSettings>("user_settings");
}

export async function saveUserSettings(settings: UserSettings) {
  return saveToSupabase<UserSettings>("user_settings", settings);
}
