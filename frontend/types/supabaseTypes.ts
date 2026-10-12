// ✅ Supabase type definitions for Bug Eyez View
export type NewsArticle = {
  title: string;
  description?: string;
  url: string;
  source?: string;
  image?: string;
  publishedAt?: string;
};

export type AISummary = {
  id?: string;
  channel_id?: string;
  program_title?: string;
  summary: string;
  entities?: Record<string, string>;
  related_links?: Record<string, string>;
  model_used?: string;
  created_at?: string;
};

export type EPGEntry = {
  id?: string;
  channel_id: string;
  date: string;
  data: Record<string, any>;
  updated_at?: string;
};

export type UserSettings = {
  id?: string;
  user_id?: string;
  preferences: {
    theme?: string;
    shimmerIntensity?: number;
    soundVolume?: number;
    refreshMinutes?: number;
    tone?: string;
  };
  updated_at?: string;
};
