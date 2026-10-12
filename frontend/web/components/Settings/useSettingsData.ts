"use client";

import { useCallback, useEffect, useState } from "react";

export type BugEyezSettings = {
  hideUnstableChannels: boolean;
  showLockedYoutubeChannels: boolean;
  showNowNextBanner: boolean;
  compactGuideMode: boolean;
  defaultStartView: "live" | "home" | "profile" | "settings";
guideDensity: "comfortable" | "compact" | "ultra";
themeMode: "dark" | "holographic" | "neon";
accentColor: "cyan" | "emerald" | "gold" | "purple" | "red";
showHomeRecommended: boolean;
showHomeFavorites: boolean;
showHomeRecent: boolean;
homeSectionOrder: string[];
showHomeContinueWatching: boolean;
showHomeRewards: boolean;
};

const SETTINGS_KEY = "bugz_settings_v1";

const DEFAULT_SETTINGS: BugEyezSettings = {
  hideUnstableChannels: false,
  showLockedYoutubeChannels: true,
  showNowNextBanner: true,

  compactGuideMode: false,
  guideDensity: "comfortable",

  defaultStartView: "live",

  homeSectionOrder: [
  "quickActions",
  "rewards",
  "recommended",
  "newFavorites",
  "continueWatching",
  "recent",
  "favoritesLive",
  "liveNow",
],
  themeMode: "dark",
  accentColor: "cyan",
showHomeRecommended: true,
showHomeFavorites: true,
showHomeRecent: true,
showHomeContinueWatching: true,
showHomeRewards: true,
};

export function useSettingsData() {
  const [settings, setSettings] =
    useState<BugEyezSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      setSettings({
        ...DEFAULT_SETTINGS,
        ...parsed,
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof BugEyezSettings>(
      key: K,
      value: BugEyezSettings[K]
    ) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}