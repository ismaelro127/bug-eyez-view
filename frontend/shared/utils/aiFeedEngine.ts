/**
 * aiFeedEngine.ts
 * Blends memory, tone, news, and EPG into a weighted adaptive feed.
 * Strongly typed for TypeScript safety.
 */

export function generateAdaptiveFeed(
  memory: any[],
  tone: { id: string; name: string; desc?: string; style?: Record<string, string> },
  news: any[],
  epg: any[],
  weights: Record<string, number>
): any[] {
  const merged: any[] = [];

  // ✅ Memory recall: prioritize relevant past context
  memory.forEach((m: Record<string, any>) => {
    const score = calculateRelevance(m, tone, weights);
    merged.push({ type: "memory", data: m, score });
  });

  // ✅ News weighting
  news.forEach((n: Record<string, any>) => {
    const score = calculateRelevance(n, tone, weights);
    merged.push({ type: "news", data: n, score });
  });

  // ✅ EPG (programs) weighting
  epg.forEach((p: Record<string, any>) => {
    const score = calculateRelevance(p, tone, weights);
    merged.push({ type: "program", data: p, score });
  });

  // ✅ Sort by descending score
  merged.sort((a, b) => b.score - a.score);

  // ✅ Trim to top 50 adaptive entries
  return merged.slice(0, 50);
}

/**
 * Calculates how relevant an item is based on tone, category, and weights
 */
function calculateRelevance(
  item: Record<string, any>,
  tone: { id: string; name: string },
  weights: Record<string, number>
): number {
  const text = JSON.stringify(item).toLowerCase();
  let score = 0;

  Object.entries(weights).forEach(([key, w]: [string, number]) => {
    if (text.includes(key.toLowerCase())) {
      score += w;
    }
  });

  // ✅ Tone match gives bonus
  if (text.includes(tone.id.toLowerCase()) || text.includes(tone.name.toLowerCase())) {
    score += 2;
  }

  // ✅ Small random factor for diversity
  score += Math.random() * 0.5;

  return score;
}

/**
 * Smoothly updates feed over time
 */
export function evolveFeed(
  feed: any[],
  memory: any[],
  news: any[],
  epg: any[],
  weights: Record<string, number>
): any[] {
  const next = generateAdaptiveFeed(memory, { id: "default", name: "Default" }, news, epg, weights);

  // ✅ Blend old and new feeds
  const map = new Map<string, any>();
  [...feed, ...next].forEach((it: any) => {
    const key = it.data?.id || JSON.stringify(it.data).slice(0, 100);
    if (!map.has(key)) {
      map.set(key, it);
    } else {
      const existing = map.get(key);
      existing.score = (existing.score + it.score) / 2;
    }
  });

  return Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 50);
}

/**
 * Combines weights dynamically (useful for live AI adjustments)
 */
export function mergeWeights(
  base: Record<string, number>,
  adjustment: Record<string, number>
): Record<string, number> {
  const combined: Record<string, number> = { ...base };

  Object.entries(adjustment).forEach(([k, w]: [string, number]) => {
    if (typeof w === "number") {
      combined[k] = (combined[k] ?? 0) + w;
    }
  });

  return combined;
}
