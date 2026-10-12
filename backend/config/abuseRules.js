export const ABUSE_RULES = {
  WATCH_HEARTBEAT: {
    maxHits: 30,              // 30 heartbeats
    windowMs: 60_000,         // per 1 minute
  },

  AD_COMPLETE: {
    maxHits: 10,              // 10 ads
    windowMs: 60 * 60 * 1000, // per 1 hour
  },

  UNLOCK_ATTEMPT: {
  maxHits: 5,
  windowMs: 24 * 60 * 60 * 1000,
  severity: "high",
},

};
