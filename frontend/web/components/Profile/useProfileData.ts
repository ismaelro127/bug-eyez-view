"use client";

import { useCallback, useEffect, useState } from "react";

type UseProfileDataOptions = {
  API_BASE: string;
  autoLoad?: boolean;
};

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function useProfileData({
  API_BASE,
  autoLoad = true,
}: UseProfileDataOptions) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userFeatures, setUserFeatures] = useState<any>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditLedger, setCreditLedger] = useState<any[]>([]);
  const [unlockedChannelIds, setUnlockedChannelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();

      const [featuresRes, balanceRes, ledgerRes, unlocksRes] =
        await Promise.all([
          fetch(`${API_BASE}/api/user-features/me`, {
            credentials: "include",
            headers,
          }),
          fetch(`${API_BASE}/api/credits/balance`, {
            credentials: "include",
            headers,
          }),
          fetch(`${API_BASE}/api/credits/ledger`, {
            credentials: "include",
            headers,
          }),
          fetch(`${API_BASE}/api/credits/user/unlocks`, {
            credentials: "include",
            headers,
          }),
        ]);

      if (featuresRes.status === 401 || featuresRes.status === 403) {
        setError("Profile session was not accepted. Please log out and log back in.");
        return;
      }

      if (featuresRes.ok) {
        const data = await featuresRes.json();
        setUserProfile(data.user ?? null);
        setUserFeatures(data.features ?? null);
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setCreditBalance(data.credits ?? 0);
      }

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setCreditLedger(Array.isArray(data.ledger) ? data.ledger : []);
      }

      if (unlocksRes.ok) {
        const data = await unlocksRes.json();
        setUnlockedChannelIds(
          Array.isArray(data.unlockedChannelIds)
            ? data.unlockedChannelIds
            : []
        );
      }

      if (!featuresRes.ok || !balanceRes.ok || !ledgerRes.ok || !unlocksRes.ok) {
        setError("Some profile data could not be loaded.");
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
      setError("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (!autoLoad) return;
    loadProfileData();
  }, [autoLoad, loadProfileData]);

  return {
    userProfile,
    userFeatures,
    creditBalance,
    creditLedger,
    unlockedChannelIds,
    loading,
    error,
    loadProfileData,
  };
}