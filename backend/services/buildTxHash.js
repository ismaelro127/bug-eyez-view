import crypto from "crypto";

/**
 * Runtime-validated secret
 * This function guarantees a string return type
 */
function getLedgerSecret() {
  const secret =
    process.env.LEDGER_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("LEDGER_SECRET is not defined");
  }

  return secret;
}

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
    keyId,
    userId,
    delta,
    reason,
    source,
    refType,
    refId,
    prevHash,
  ].join("|");

  const secret = getLedgerSecret(); // ✅ string, never undefined

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}
