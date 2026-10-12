export function computeAdCooldownMs({
  abuseScore = 0,
  recentViolations = 0,
  trustTier = "normal",
}) {
  // Base cooldown by trust tier
  let base;

  switch (trustTier) {
    case "trusted":
      base = 20_000;
      break;
    case "restricted":
      base = 120_000;
      break;
    case "shadow":
      return Infinity;
    default:
      base = 60_000;
  }

  // Exponential abuse scaling
  const abuseMultiplier = Math.pow(1.5, Math.min(abuseScore, 10));

  // Violation weight
  const violationPenalty = recentViolations * 20_000;

  let cooldown = base * abuseMultiplier + violationPenalty;

  // Random jitter (anti-timing exploitation)
  const jitter = Math.floor(Math.random() * 10_000);
  cooldown += jitter;

  // Hard ceiling (15 minutes)
  return Math.min(cooldown, 15 * 60_000);
}