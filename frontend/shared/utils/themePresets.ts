// utils/themePresets.ts
/**
 * 🔮 applyTheme()
 * Dynamically updates the app's holographic tone system
 * with optional adaptive color logic based on content type.
 */

import { spawnColorTrail } from "../../web/lib/holoTrailManager";

export type TonePreset = {
  id: string;
  name: string;
  accent: string;
  glow: string;
};

const toneMap: Record<string, TonePreset> = {
  emerald: {
    id: "emerald",
    name: "Emerald Calm",
    accent: "#00ffc8",
    glow: "rgba(0,255,200,0.45)",
  },
  sky: {
    id: "sky",
    name: "Sky Pulse",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.45)",
  },
  violet: {
    id: "violet",
    name: "Violet Dream",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.45)",
  },
  amber: {
    id: "amber",
    name: "Amber Flow",
    accent: "#fbbf24",
    glow: "rgba(251,191,36,0.45)",
  },
  pink: {
    id: "pink",
    name: "Neon Rose",
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.45)",
  },
};

/**
 * Core: Sets theme instantly based on a tone or a genre/context string.
 * @param toneOrContext - either "emerald", "sky", or a genre like "news", "sports", etc.
 */
export function applyTheme(toneOrContext: TonePreset | string) {
  const tone = resolveTone(toneOrContext);

  const root = document.documentElement;
  root.style.setProperty("--tone-primary", tone.accent);
  root.style.setProperty("--tone-accent", tone.accent);
  root.style.setProperty("--tone-shadow", tone.glow);
  root.style.setProperty("--holo-accent", hexToRgb(tone.accent));
  root.style.setProperty("--holo-brightness", "1");
  spawnColorTrail();

  // Animated feedback pulse
  document.body.animate(
    [
      { filter: "brightness(0.8) saturate(1.1)" },
      { filter: "brightness(1.05) saturate(1.4)" },
      { filter: "brightness(1) saturate(1.2)" },
    ],
    { duration: 900, easing: "ease-in-out" }
  );
}

/**
 * Automatically map genres / content categories → tones
 */
function resolveTone(input: TonePreset | string): TonePreset {
  if (typeof input !== "string") return input;
  const context = input.toLowerCase();

  // 🎨 Smart tone mapping logic
  if (context.includes("news") || context.includes("politic"))
    return toneMap.sky; // blue calm tone
  if (context.includes("sports") || context.includes("energy"))
    return toneMap.amber; // fast bright yellow tone
  if (context.includes("music") || context.includes("entertainment"))
    return toneMap.pink; // neon nightclub tone
  if (context.includes("science") || context.includes("tech"))
    return toneMap.violet; // analytical violet tone
  if (context.includes("nature") || context.includes("documentary"))
    return toneMap.emerald; // calm green tone

  return toneMap.emerald;
}

/** Convert HEX → RGB for CSS variables */
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}
