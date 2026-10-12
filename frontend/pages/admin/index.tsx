import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/apiFetch";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type AdminMetrics = {
  totalRewards: number;
  todayRewards: number;
  shadowedUsers: number;
  restrictedUsers: number;
};

type LedgerEntry = {
  _id: string;
  txnId: string;
  userId: string;
  delta: number;
  reason: string;
  source: string;
  refType: string;
  refId: string;
  prevHash: string;
  txHash: string;
  keyId?: string;
  ip?: string;
  userAgent?: string;
  meta?: any;
  createdAt: string;
};

type UserFeatures = {
  userId: string;
  trustTier?: "trusted" | "normal" | "restricted" | "shadow";
  abuseScore?: number;
  recentViolations?: number;
  restrictedUntil?: string | null;
  lastAbuseAt?: string | null;
  lastDeviceHash?: string | null;
  abuseLog?: Array<{ reason: string; points: number; at: string; meta?: any }>;
};

type UserInspectResponse = {
  features: UserFeatures;
  recentRewards: LedgerEntry[];
};


function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
function badgeClass(tier?: string) {
  switch (tier) {
    case "trusted":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "normal":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "restricted":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "shadow":
      return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30";
    default:
      return "bg-white/10 text-white/80 border-white/15";
  }
}

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);
const [token, setToken] = useState<string | null>(null);

useEffect(() => {
  setMounted(true);
  setToken(localStorage.getItem("token"));
}, []);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsErr, setMetricsErr] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerErr, setLedgerErr] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Filters
  const [userIdFilter, setUserIdFilter] = useState("");
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");

  // Inspector
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<UserInspectResponse | null>(
    null
  );
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectErr, setInspectErr] = useState<string | null>(null);

  // Admin controls
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [controlMsg, setControlMsg] = useState<string | null>(null);

  // ---------- Fetch helpers ----------

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      `${res.status} ${res.statusText}`;

    throw new Error(msg);
  }

  return data as T;
}
  // ---------- Load metrics ----------
  useEffect(() => {
    if (!token) return;

    (async () => {
      setMetricsLoading(true);
      setMetricsErr(null);
      try {
        const data = await api<AdminMetrics>("/api/admin/metrics");
        setMetrics(data);
      } catch (e: any) {
        setMetricsErr(e?.message || "Failed to load metrics");
      } finally {
        setMetricsLoading(false);
      }
    })();
  }, [token]);

  // ---------- Load ledger ----------
  async function loadLedger() {
    if (!token) return;

    setLedgerLoading(true);
    setLedgerErr(null);
    try {
      const qs = new URLSearchParams();
      if (userIdFilter.trim()) qs.set("userId", userIdFilter.trim());
      qs.set("limit", String(limit));

      const data = await api<{ entries: LedgerEntry[] }>(
        `/api/admin/ledger?${qs.toString()}`
      );

      setLedger(data.entries || []);
    } catch (e: any) {
      setLedgerErr(e?.message || "Failed to load ledger");
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }

  useEffect(() => {
    loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userIdFilter, limit]);

  // ---------- User inspector ----------
  async function openUser(userId: string) {
    setInspectUserId(userId);
    setInspectData(null);
    setInspectErr(null);
    setInspectLoading(true);

    try {
      const data = await api<UserInspectResponse>(`/api/admin/users/${userId}`);
      setInspectData(data);
    } catch (e: any) {
      setInspectErr(e?.message || "Failed to inspect user");
    } finally {
      setInspectLoading(false);
    }
  }

  // ---------- Derived: search filter ----------
  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ledger;

    return ledger.filter((x) => {
      return (
        x.userId?.toLowerCase().includes(q) ||
        x.refId?.toLowerCase().includes(q) ||
        x.reason?.toLowerCase().includes(q) ||
        x.source?.toLowerCase().includes(q) ||
        x.ip?.toLowerCase().includes(q)
      );
    });
  }, [ledger, search]);

  // ---------- Charts ----------
  const dailySeries = useMemo(() => {
    // simple “last 7 days” bucket from ledger (client-side)
    const map = new Map<string, number>();
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    for (const e of ledger) {
      if (e.refType !== "ad_reward") continue;
      const key = (e.createdAt || "").slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries()).map(([date, rewards]) => ({
      date,
      rewards,
    }));
  }, [ledger]);

  const topUsers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of ledger) {
      if (e.refType !== "ad_reward") continue;
      counts.set(e.userId, (counts.get(e.userId) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));
  }, [ledger]);

  // ---------- Controls ----------
  async function setAds(on: boolean) {
    if (!token) return;
    setControlMsg(null);

    try {
      if (on) await api("/api/admin/controls/ads/enable", { method: "POST" });
      else await api("/api/admin/controls/ads/disable", { method: "POST" });

      setAdsEnabled(on);
      setControlMsg(on ? "Ads enabled" : "Ads disabled");
    } catch (e: any) {
      setControlMsg(e?.message || "Failed to update ad switch");
    }
  }

  async function setTrustTier(userId: string, tier: string) {
    if (!token) return;
    setControlMsg(null);

    try {
      await api(`/api/admin/controls/trust/${userId}`, {
        method: "POST",
        body: JSON.stringify({ tier }),
      });
      setControlMsg(`Set trust tier to ${tier} for ${userId}`);
      // refresh inspector + ledger
      if (inspectUserId === userId) openUser(userId);
      loadLedger();
    } catch (e: any) {
      setControlMsg(e?.message || "Failed to set trust tier");
    }
  }

  async function grantCredits(userId: string, amount: number) {
    if (!token) return;
    setControlMsg(null);

    try {
      await api(`/api/admin/controls/grant`, {
        method: "POST",
        body: JSON.stringify({ userId, amount }),
      });
      setControlMsg(`Granted ${amount} credits to ${userId}`);
      if (inspectUserId === userId) openUser(userId);
      loadLedger();
    } catch (e: any) {
      setControlMsg(e?.message || "Failed to grant credits");
    }
  }

  // ---------- Guard ----------
  if (!mounted) {
  return <div className="min-h-screen bg-black text-white" />;
}
if (!token) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-3 text-white/70">
            You must be logged in. (token missing)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-white/60 mt-1">
              Abuse • Rewards • Ledger • Controls
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAds(false)}
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
            >
              Disable Ads
            </button>
            <button
              onClick={() => setAds(true)}
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
            >
              Enable Ads
            </button>
          </div>
        </div>

        {controlMsg && (
          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/80">
            {controlMsg}
          </div>
        )}

        {/* KPI Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Rewards"
            value={
              metricsLoading
                ? "…"
                : metricsErr
                ? "—"
                : fmt(metrics?.totalRewards || 0)
            }
            sub={metricsErr ? metricsErr : "All-time ad reward events"}
          />
          <KpiCard
            title="Today Rewards"
            value={
              metricsLoading
                ? "…"
                : metricsErr
                ? "—"
                : fmt(metrics?.todayRewards || 0)
            }
            sub="Since midnight"
          />
          <KpiCard
            title="Shadowed Users"
            value={
              metricsLoading
                ? "…"
                : metricsErr
                ? "—"
                : fmt(metrics?.shadowedUsers || 0)
            }
            sub="trustTier=shadow"
          />
          <KpiCard
            title="Restricted Users"
            value={
              metricsLoading
                ? "…"
                : metricsErr
                ? "—"
                : fmt(metrics?.restrictedUsers || 0)
            }
            sub="trustTier=restricted"
          />
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Rewards (last 7 days)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.6)" }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "white",
                    }}
                  />
                  <Line type="monotone" dataKey="rewards" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Top Users (by rewards in current ledger slice)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUsers}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="userId"
                    tick={false}
                    label={{
                      value: "User IDs hidden on axis (hover)",
                      position: "insideBottom",
                      fill: "rgba(255,255,255,0.45)",
                    }}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "white",
                    }}
                  />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* Ledger */}
        <div className="mt-6">
          <Panel
            title="Ledger"
            right={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  placeholder="Filter by userId…"
                  className="px-3 py-2 rounded-lg bg-black border border-white/15 text-sm outline-none"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reason/refId/ip…"
                  className="px-3 py-2 rounded-lg bg-black border border-white/15 text-sm outline-none"
                />
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-black border border-white/15 text-sm"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <button
                  onClick={loadLedger}
                  className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                >
                  Refresh
                </button>
              </div>
            }
          >
            {ledgerErr && (
              <div className="text-sm text-red-300 mb-3">{ledgerErr}</div>
            )}

            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/70">
                  <tr>
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Delta</th>
                    <th className="text-left p-3">Reason</th>
                    <th className="text-left p-3">Ref</th>
                    <th className="text-left p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <tr>
                      <td className="p-4 text-white/60" colSpan={6}>
                        Loading ledger…
                      </td>
                    </tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr>
                      <td className="p-4 text-white/60" colSpan={6}>
                        No entries.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((e) => (
                      <tr
                        key={e._id}
                        className="border-t border-white/10 hover:bg-white/5"
                      >
                        <td className="p-3 text-white/70">
                          {fmtDate(e.createdAt)}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => openUser(String(e.userId))}
                            className="underline decoration-white/20 hover:decoration-white/60"
                          >
                            {String(e.userId).slice(0, 10)}…
                          </button>
                        </td>
                        <td className="p-3">{e.delta}</td>
                        <td className="p-3">{e.reason}</td>
                        <td className="p-3 text-white/70">
                          <div className="truncate max-w-[420px]">
                            {e.refId}
                          </div>
                        </td>
                        <td className="p-3 text-white/70">{e.ip || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {/* Inspector Drawer */}
      {inspectUserId && (
        <div className="fixed inset-0 z-[99998]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setInspectUserId(null);
              setInspectData(null);
            }}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-black border-l border-white/15 p-5 overflow-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">User Inspector</div>
                <div className="text-xs text-white/60 mt-1">
                  {inspectUserId}
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectUserId(null);
                  setInspectData(null);
                }}
                className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
              >
                Close
              </button>
            </div>

            {inspectLoading && (
              <div className="mt-4 text-white/70">Loading…</div>
            )}
            {inspectErr && (
              <div className="mt-4 text-red-300 text-sm">{inspectErr}</div>
            )}

            {inspectData?.features && (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/70">Trust Tier</div>
                    <span
                      className={`text-xs border px-2 py-1 rounded-full ${badgeClass(
                        inspectData.features.trustTier
                      )}`}
                    >
                      {inspectData.features.trustTier || "normal"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <Info label="Abuse Score" value={inspectData.features.abuseScore ?? 0} />
                    <Info
                      label="Recent Violations"
                      value={inspectData.features.recentViolations ?? 0}
                    />
                    <Info
                      label="Restricted Until"
                      value={inspectData.features.restrictedUntil ? fmtDate(inspectData.features.restrictedUntil) : "—"}
                    />
                    <Info
                      label="Last Abuse"
                      value={inspectData.features.lastAbuseAt ? fmtDate(inspectData.features.lastAbuseAt) : "—"}
                    />
                    <Info
                      label="Last Device Hash"
                      value={inspectData.features.lastDeviceHash || "—"}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["trusted", "normal", "restricted", "shadow"] as const).map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() => setTrustTier(inspectUserId, t)}
                          className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                        >
                          Set {t}
                        </button>
                      )
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => grantCredits(inspectUserId, 5)}
                      className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      +5 credits
                    </button>
                    <button
                      onClick={() => grantCredits(inspectUserId, 25)}
                      className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      +25 credits
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="text-sm font-semibold">Recent Rewards</div>
                  <div className="mt-3 space-y-2">
                    {(inspectData.recentRewards || []).length === 0 ? (
                      <div className="text-sm text-white/60">No rewards.</div>
                    ) : (
                      inspectData.recentRewards.slice(0, 10).map((r) => (
                        <div
                          key={r._id}
                          className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-white/80">{r.refId}</div>
                            <div className="text-white/60">{fmtDate(r.createdAt)}</div>
                          </div>
                          <div className="mt-1 text-white/60">
                            delta: {r.delta} • ip: {r.ip || "—"}
                          </div>
                          {r.meta?.deviceHash && (
                            <div className="mt-1 text-white/50 text-xs">
                              deviceHash: {r.meta.deviceHash}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {Array.isArray(inspectData.features.abuseLog) && (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                    <div className="text-sm font-semibold">Recent Abuse Log</div>
                    <div className="mt-3 space-y-2">
                      {inspectData.features.abuseLog!.slice(-5).map((a, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-white/80">
                              {a.reason} (+{a.points})
                            </div>
                            <div className="text-white/60">{fmtDate(a.at)}</div>
                          </div>
                          {a.meta && (
                            <pre className="mt-2 text-xs text-white/50 overflow-auto">
                              {JSON.stringify(a.meta, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-sm text-white/70">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-2 text-xs text-white/50">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-sm text-white/80 break-all">{String(value)}</div>
    </div>
  );
}
