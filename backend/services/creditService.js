import crypto from "crypto";

export function buildTxHash({
  userId,
  delta,
  reason,
  source,
  refType,
  refId,
  prevHash,
  keyId = "v1",
}) {
  const payload = [
    userId,
    delta,
    reason,
    source,
    refType,
    refId,
    prevHash,
  ].join("|");

  return crypto
    .createHmac("sha256", process.env.LEDGER_SECRET)
    .update(payload)
    .digest("hex");
}

export async function mintCredits({
  userId,
  amount,
  reason,
  source,
  refType,
  refId,
  ip,
  userAgent,
  meta,
}) {
  // SAME BODY AS BEFORE — no logic changes
}
