"use client";

import React from "react";
import { useProfileData } from "./useProfileData";
import ProfileStatCard from "./ProfileStatCard";
import CreditLedgerList from "./CreditLedgerList";
import ProfileBadges from "./ProfileBadges";
import RewardSummaryPanel from "./RewardSummaryPanel";
import UnlockedChannelsPreview from "./UnlockedChannelsPreview";
import SkipAdsCard from "./SkipAdsCard";

type ProfileViewProps = {
  API_BASE: string;
};

export default function ProfileView({ API_BASE }: ProfileViewProps) {
  const {
    userProfile,
    userFeatures,
    creditBalance,
    creditLedger,
    unlockedChannelIds,
    loading,
    error,
    loadProfileData,
  } = useProfileData({ API_BASE });

  const skipAdsLabel = userFeatures?.skipAdsUntil
    ? new Date(userFeatures.skipAdsUntil).toLocaleString()
    : "Not active";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-black text-white">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1
  className="text-2xl font-bold"
  style={{ color: "var(--bug-accent)" }}
>
  👤 Profile
</h1>

          <div className="mt-2">
            <ProfileBadges
              userProfile={userProfile}
              userFeatures={userFeatures}
            />
          </div>
        </div>

        <button
  onClick={loadProfileData}
  className="px-3 py-1.5 rounded-lg text-sm shrink-0"
  style={{
    background: "var(--bug-accent-soft)",
    color: "var(--bug-accent)",
    border: "1px solid var(--bug-accent-border)",
    boxShadow: "var(--bug-glow)",
  }}
>
  Refresh
</button>
      </div>

      {loading && (
        <div className="mb-3 text-sm text-gray-400">
          Loading profile…
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ProfileStatCard
          label="Username"
          value={userProfile?.username || "User"}
          subValue={userProfile?.email || ""}
          tone="default"
        />

        <ProfileStatCard
          label="Credits"
          value={creditBalance}
          tone="emerald"
        />

        <ProfileStatCard
          label="Trust Tier"
          value={userFeatures?.trustTier || "normal"}
          tone="cyan"
        />

        <ProfileStatCard
          label="Unlocked Channels"
          value={unlockedChannelIds.length}
          tone="yellow"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <ProfileStatCard
          label="Rewarded Ads Watched"
          value={userFeatures?.totalRewardedAds ?? 0}
          tone="purple"
        />

        <ProfileStatCard
          label="Abuse Score"
          value={userFeatures?.abuseScore ?? 0}
          tone={
            (userFeatures?.abuseScore ?? 0) > 0
              ? "red"
              : "default"
          }
        />

        <ProfileStatCard
          label="Skip Ads Until"
          value={skipAdsLabel}
          tone="default"
        />
      </div>

<SkipAdsCard
  API_BASE={API_BASE}
  creditBalance={creditBalance}
  skipAdsUntil={userFeatures?.skipAdsUntil}
  onSuccess={loadProfileData}
/>

<RewardSummaryPanel ledger={creditLedger} />

<UnlockedChannelsPreview unlockedChannelIds={unlockedChannelIds} />

<CreditLedgerList ledger={creditLedger} />
    </div>
  );
}