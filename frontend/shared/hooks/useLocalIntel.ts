import { useEffect, useState } from "react";

export type TonePreset = {
  id: string;
  name: string;
  accent: string;
  glow: string;
};

export type UserPrefs = {
  particles: boolean;
  trails: boolean;
  shimmerIntensity: number;
  soundVolume: number;
  refreshMinutes: number;
  tone: TonePreset;
};

const defaultTone: TonePreset = {
  id: "emerald",
  name: "Emerald Calm",
  accent: "#00ffc8",
  glow: "rgba(0,255,200,0.4)",
};

const defaultPrefs: UserPrefs = {
  particles: true,
  trails: true,
  shimmerIntensity: 0.6,
  soundVolume: 0.5,
  refreshMinutes: 15,
  tone: defaultTone,
};

export function usePrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);

  useEffect(() => {
    const saved = localStorage.getItem("bugeyez_prefs");
    if (saved) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(saved) });
      } catch {
        setPrefs(defaultPrefs);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bugeyez_prefs", JSON.stringify(prefs));
  }, [prefs]);

  return { prefs, setPrefs };
}
