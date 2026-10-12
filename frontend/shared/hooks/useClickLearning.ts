import { useEffect, useState } from "react";

type Weights = {
  keywords: Record<string, number>; // "palestine" -> 2.5
  types: Record<string, number>;    // "news" | "program" | "person"
  lastDecay: number;                // epoch ms
};

const DEFAULT: Weights = { keywords: {}, types: {}, lastDecay: 0 };
const KEY = "bugview_click_weights";

export function useClickLearning() {
  const [weights, setWeights] = useState<Weights>(DEFAULT);

  // load
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setWeights({ ...DEFAULT, ...JSON.parse(raw) });
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(weights));
  }, [weights]);

  // smooth decay (called occasionally)
  function decay(factor = 0.97) {
    const now = Date.now();
    if (now - (weights.lastDecay || 0) < 6 * 60 * 60 * 1000) return; // 6h
    const kw = Object.fromEntries(
      Object.entries(weights.keywords).map(([k, v]) => [k, v * factor])
    );
    const tp = Object.fromEntries(
      Object.entries(weights.types).map(([k, v]) => [k, v * factor])
    );
    setWeights({ keywords: kw, types: tp, lastDecay: now });
  }

  function boostKeyword(k: string, amt = 1) {
    if (!k) return;
    setWeights(w => ({
      ...w,
      keywords: { ...w.keywords, [k.toLowerCase()]: (w.keywords[k.toLowerCase()] || 0) + amt }
    }));
  }

  function boostType(t: string, amt = 0.5) {
    if (!t) return;
    setWeights(w => ({
      ...w,
      types: { ...w.types, [t]: (w.types[t] || 0) + amt }
    }));
  }

  return { weights, boostKeyword, boostType, decay };
}
