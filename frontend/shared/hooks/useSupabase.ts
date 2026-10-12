// C:\BugEyezView\frontend\shared\hooks\useSupabase.ts

export function useSupabaseTable<T = any>(_tableName: string) {
  return {
    data: [] as T[],
    loading: false,
    error: null as Error | null,

    async refetch() {
      return [] as T[];
    },
  };
}

export async function saveToSupabase<T = any>(
  _tableName: string,
  item: T
): Promise<T> {
  // Supabase is currently disabled/fallback.
  // Return the item so app logic can continue without crashing.
  return item;
}