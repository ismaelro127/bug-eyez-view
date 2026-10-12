import crypto from "crypto";

export function getDeviceHash(req: any) {
  const ua = req.headers["user-agent"] || "";
  const lang = req.headers["accept-language"] || "";
  const platform = req.headers["sec-ch-ua-platform"] || "";
  const ip = req.ip || "";

  const raw = `${ua}|${lang}|${platform}|${ip}`;

  return crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");
}
