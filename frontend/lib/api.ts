import { apiFetch } from "./apiFetch";

export function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  if (!token) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function awardAdCredits(
  adSessionId: string
) {
  const res = await apiFetch(
    "/api/credits/award",
    {
      method: "POST",
      body: JSON.stringify({
        adSessionId,
      }),
    }
  );

  const data = await res
    .json()
    .catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Credit award failed"
    );
  }

  return data as {
    ok: true;
    credits: number;
  };
}

function generateAdSessionId() {
  return `ad-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}