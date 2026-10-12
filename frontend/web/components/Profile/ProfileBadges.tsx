"use client";

import React from "react";

type ProfileBadgesProps = {
  userProfile: any;
  userFeatures: any;
};

type BadgeTone =
  | "default"
  | "admin"
  | "premium"
  | "verified"
  | "trust"
  | "warning"
  | "danger";

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  const getStyle = (): React.CSSProperties => {
    if (tone === "admin") {
      return {
        color: "#fca5a5",
        border: "1px solid rgba(248,113,113,0.45)",
        background: "rgba(248,113,113,0.12)",
        boxShadow: "0 0 16px rgba(248,113,113,0.18)",
      };
    }

    if (tone === "warning") {
      return {
        color: "#fdba74",
        border: "1px solid rgba(251,146,60,0.45)",
        background: "rgba(251,146,60,0.12)",
        boxShadow: "0 0 16px rgba(251,146,60,0.15)",
      };
    }

    if (tone === "danger") {
      return {
        color: "#f87171",
        border: "1px solid rgba(248,113,113,0.55)",
        background: "rgba(127,29,29,0.35)",
        boxShadow: "0 0 18px rgba(248,113,113,0.22)",
      };
    }

    if (
      tone === "premium" ||
      tone === "verified" ||
      tone === "trust"
    ) {
      return {
        color: "var(--bug-accent)",
        border: "1px solid var(--bug-accent-border)",
        background: "var(--bug-accent-soft)",
        boxShadow: "var(--bug-glow)",
      };
    }

    return {
      color: "rgba(255,255,255,0.78)",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.08)",
    };
  };

  return (
    <span
      className="
        inline-flex items-center rounded-full
        px-2.5 py-1 text-xs font-bold
      "
      style={getStyle()}
    >
      {children}
    </span>
  );
}

export default function ProfileBadges({
  userProfile,
  userFeatures,
}: ProfileBadgesProps) {
  const isAdmin = !!userProfile?.roles?.admin;
  const isPremium = !!userProfile?.roles?.premium;
  const emailVerified = !!userProfile?.emailVerified;
  const trustTier = userFeatures?.trustTier || "normal";
  const abuseScore = userFeatures?.abuseScore ?? 0;

  const trustLabel =
    typeof trustTier === "string"
      ? trustTier.charAt(0).toUpperCase() + trustTier.slice(1)
      : "Normal";

  return (
    <div className="flex flex-wrap gap-2">
      {isAdmin && <Badge tone="admin">🛡️ Admin</Badge>}

      {isPremium && <Badge tone="premium">💎 Premium</Badge>}

      {!isAdmin && !isPremium && (
        <Badge>👤 User</Badge>
      )}

      {emailVerified ? (
        <Badge tone="verified">✅ Email Verified</Badge>
      ) : (
        <Badge tone="warning">⚠️ Email Not Verified</Badge>
      )}

      <Badge tone="trust">Trust: {trustLabel}</Badge>

      {abuseScore > 0 ? (
        <Badge tone={abuseScore >= 5 ? "danger" : "warning"}>
          Abuse Score: {abuseScore}
        </Badge>
      ) : (
        <Badge>Clean Activity</Badge>
      )}
    </div>
  );
}