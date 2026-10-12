export interface NormalizedEPG {
  channel_id: string;
  channel_name: string;
  programs: {
    title: string;
    description?: string;
    start_utc: string;
    stop_utc: string;
    start_min: number;
    end_min: number;
    isFallback?: boolean;
  }[];
  generated_at: string;
}
