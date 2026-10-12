"use client";

import React from "react";

type RewardSummaryPanelProps = {
  ledger: any[];
};

export default function RewardSummaryPanel({
  ledger,
}: RewardSummaryPanelProps) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];

  const rewardedAds = safeLedger.filter(
    (item) => item.reason === "rewarded_ad"
  );

  const creditsEarnedFromAds = rewardedAds.reduce((sum, item) => {
    const delta = typeof item.delta === "number" ? item.delta : 0;
    return delta > 0 ? sum + delta : sum;
  }, 0);

  const totalCreditsSpent = safeLedger.reduce((sum, item) => {
    const delta = typeof item.delta === "number" ? item.delta : 0;
    return delta < 0 ? sum + Math.abs(delta) : sum;
  }, 0);

  const netCreditChange = safeLedger.reduce((sum, item) => {
    const delta = typeof item.delta === "number" ? item.delta : 0;
    return sum + delta;
  }, 0);

  const skippedRewards = rewardedAds.filter(
    (item) => item.meta?.rewardReason === "skipped_after_delay"
  ).length;

  const completedRewards = rewardedAds.filter(
    (item) => item.meta?.rewardReason === "completed"
  ).length;

  const lastReward = rewardedAds[0];

  const statCardStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.28)",
  };

  const accentStatCardStyle: React.CSSProperties = {
    border: "1px solid var(--bug-accent-border)",
    background: "rgba(0,0,0,0.28)",
    boxShadow: "var(--bug-glow)",
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
          🎁 Reward Summary
        </div>

        <div className="text-xs text-gray-300/80">
          Credits earned, spent, and tracked from recent activity.
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-4">
        <div
          className="rounded-xl p-3"
          style={statCardStyle}
        >
          <div className="text-xs text-gray-400">
            Ad Rewards
          </div>

          <div className="text-2xl font-black text-white">
            {rewardedAds.length}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={accentStatCardStyle}
        >
          <div
            className="text-xs"
            style={{ color: "var(--bug-accent)" }}
          >
            Ad Credits Earned
          </div>

          <div
            className="text-2xl font-black"
            style={{ color: "var(--bug-accent)" }}
          >
            +{creditsEarnedFromAds}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={statCardStyle}
        >
          <div className="text-xs text-gray-400">
            Credits Spent
          </div>

          <div className="text-2xl font-black text-red-300">
            -{totalCreditsSpent}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={statCardStyle}
        >
          <div className="text-xs text-gray-400">
            Net Change
          </div>

          <div
            className={`text-2xl font-black ${
              netCreditChange >= 0 ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {netCreditChange >= 0 ? "+" : ""}
            {netCreditChange}
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
        <div
          className="rounded-xl p-3"
          style={statCardStyle}
        >
          <div className="text-xs text-gray-400">
            Skipped After Delay
          </div>

          <div
            className="text-xl font-black"
            style={{ color: "var(--bug-accent)" }}
          >
            {skippedRewards}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={statCardStyle}
        >
          <div className="text-xs text-gray-400">
            Completed Ads
          </div>

          <div
            className="text-xl font-black"
            style={{ color: "var(--bug-accent)" }}
          >
            {completedRewards}
          </div>
        </div>
      </div>

      {lastReward && (
        <div className="px-4 pb-4 text-xs text-gray-300/80">
          Last reward:{" "}
          <span
            className="font-bold"
            style={{ color: "var(--bug-accent)" }}
          >
            +{lastReward.delta} credits
          </span>{" "}
          ·{" "}
          {lastReward.createdAt
            ? new Date(lastReward.createdAt).toLocaleString()
            : ""}
        </div>
      )}
    </div>
  );
}