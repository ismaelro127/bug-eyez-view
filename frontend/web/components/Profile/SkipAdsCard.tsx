"use client";

import React, { useState } from "react";
import { apiFetch } from "../../../lib/apiFetch";

type SkipAdsCardProps = {
  API_BASE: string;
  creditBalance: number;
  skipAdsUntil?: string | null;
  onSuccess: () => void;
};

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default function SkipAdsCard({
  API_BASE,
  creditBalance,
  skipAdsUntil,
  onSuccess,
}: SkipAdsCardProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const active =
    !!skipAdsUntil && new Date(skipAdsUntil).getTime() > Date.now();

  const canSpend = creditBalance >= 10 && !active && !loading;

  const handleSkipAds = async () => {
    if (creditBalance < 10) {
      setMessage("Not enough credits. You need 10 credits.");
      return;
    }

    if (active) {
      setMessage("Skip Ads is already active.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
          const res = await apiFetch("/api/credits/spend/skip-ads", {
        method: "POST",
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        setMessage("Your login session was not accepted. Please log out and log back in.");
        return;
      }

      if (!res.ok) {
        setMessage(data?.message || data?.error || "Failed to activate skip ads.");
        return;
      }

      setMessage("Skip Ads activated for 30 minutes.");
      onSuccess();
    } catch (err) {
      console.error("Skip ads request failed:", err);
      setMessage("Request failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--bug-accent-border)",
        background: "var(--bug-accent-soft)",
        boxShadow: "var(--bug-glow)",
      }}
    >
      <div
        className="px-4 py-3"
        style={{
          borderBottom: "1px solid var(--bug-accent-border)",
        }}
      >
        <div
          className="font-bold"
          style={{ color: "var(--bug-accent)" }}
        >
          🚀 Skip Ads Boost
        </div>

        <div className="text-xs text-gray-300/80">
          Spend 10 credits to skip ads for 30 minutes.
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-gray-300">
            Current credits:{" "}
            <span
              className="font-bold"
              style={{ color: "var(--bug-accent)" }}
            >
              {creditBalance}
            </span>
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Status:{" "}
            {active ? (
              <span style={{ color: "var(--bug-accent)" }}>
                Active until {new Date(skipAdsUntil!).toLocaleString()}
              </span>
            ) : (
              <span>Not active</span>
            )}
          </div>

          {message && (
            <div
              className="text-xs mt-2"
              style={{ color: "var(--bug-accent)" }}
            >
              {message}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSkipAds}
          disabled={loading || active}
          className="px-4 py-2 rounded-lg text-sm font-bold transition"
          style={{
            background: canSpend
              ? "var(--bug-accent)"
              : "rgba(255,255,255,0.10)",
            color: canSpend ? "black" : "rgba(255,255,255,0.45)",
            border: canSpend
              ? "1px solid var(--bug-accent-border)"
              : "1px solid rgba(255,255,255,0.12)",
            cursor: loading || active ? "not-allowed" : "pointer",
            boxShadow: canSpend ? "var(--bug-glow)" : "none",
          }}
        >
          {active
            ? "Active"
            : loading
            ? "Activating..."
            : creditBalance < 10
            ? "Need 10 Credits"
            : "Spend 10 Credits"}
        </button>
      </div>
    </div>
  );
}