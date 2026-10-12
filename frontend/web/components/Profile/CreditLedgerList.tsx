"use client";

import React from "react";

type CreditLedgerListProps = {
  ledger: any[];
};

function formatReason(item: any) {
  if (item.reason === "rewarded_ad") return "Rewarded Ad";
  if (item.reason === "unlock_channel") return "Channel Unlock";
  if (item.reason === "skip_ads_30_min") return "Skip Ads";
  return item.reason || "Credit Activity";
}

function formatSubReason(item: any) {
  const rewardReason = item.meta?.rewardReason;
  const source = item.source || "system";
  const channelId = item.meta?.channelId;

  if (rewardReason && channelId) {
    return `${rewardReason.replace(/_/g, " ")} · ${channelId}`;
  }

  if (rewardReason) return rewardReason.replace(/_/g, " ");
  if (channelId) return channelId;

  return source;
}

function getBadge(item: any) {
  if (item.reason === "rewarded_ad") return "AD";
  if (item.reason === "unlock_channel") return "UNLOCK";
  if (item.reason === "skip_ads_30_min") return "SKIP";
  if (item.delta < 0) return "SPEND";
  return "CREDIT";
}

export default function CreditLedgerList({
  ledger,
}: CreditLedgerListProps) {
  const safeLedger = Array.isArray(ledger) ? ledger : [];
  const recentLedger = safeLedger.slice(0, 10);

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          borderBottom: "1px solid var(--bug-accent-border)",
        }}
      >
        <div
          className="font-bold"
          style={{ color: "var(--bug-accent)" }}
        >
          Recent Credit Activity
        </div>

        <div className="text-xs text-gray-500">
          Last {recentLedger.length} entries
        </div>
      </div>

      {recentLedger.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">
          No credit activity yet.
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {recentLedger.map((item) => {
            const delta =
              typeof item.delta === "number" ? item.delta : 0;

            const isPositive = delta >= 0;
            const badge = getBadge(item);

            return (
              <div
                key={item._id || item.txnId || `${item.reason}-${item.createdAt}`}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div
                    className="text-[10px] font-black px-2 py-1 rounded-full shrink-0"
                    style={{
                      color: isPositive
                        ? "var(--bug-accent)"
                        : "#fca5a5",
                      border: isPositive
                        ? "1px solid var(--bug-accent-border)"
                        : "1px solid rgba(248,113,113,0.45)",
                      background: isPositive
                        ? "var(--bug-accent-soft)"
                        : "rgba(248,113,113,0.12)",
                    }}
                  >
                    {badge}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {formatReason(item)}
                    </div>

                    <div className="text-xs text-gray-500 truncate">
                      {formatSubReason(item)} ·{" "}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </div>
                  </div>
                </div>

                <div
                  className="text-lg font-black shrink-0"
                  style={{
                    color: isPositive
                      ? "var(--bug-accent)"
                      : "#fca5a5",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {delta}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}