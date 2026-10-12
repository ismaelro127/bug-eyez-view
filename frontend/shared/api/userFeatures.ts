import { apiFetch } from "../../lib/apiFetch";

export async function fetchUserFeatures() {
  const res = await apiFetch("/api/user-features/me", {
    method: "GET",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to load user features");
  }

  return data;
}

export async function unlockChannel(channelId: string) {
  const res = await apiFetch("/api/user-features/unlock-channel", {
    method: "POST",
    body: JSON.stringify({ channelId }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to unlock channel");
  }

  return data;
}