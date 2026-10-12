"use client";

import React, { useState } from "react";
import { logger } from "../../utils/logger";
import SettingsToggle from "./SettingsToggle";
import type { BugEyezSettings } from "./useSettingsData";
import { apiFetch } from "../../../lib/apiFetch";
import { useToast } from "../ui/ToastProvider";
type SettingsViewProps = {
  settings: BugEyezSettings;
  updateSetting: <K extends keyof BugEyezSettings>(
    key: K,
    value: BugEyezSettings[K]
  ) => void;
  resetSettings: () => void;
  onLogout?: () => void;
userProfile?: any;
userFeatures?: any;
favoriteIDs?: string[];
recentChannelIds?: string[];
setFavoriteIDs?: React.Dispatch<React.SetStateAction<string[]>>;
setRecentChannelIds?: React.Dispatch<React.SetStateAction<string[]>>;
API_BASE: string;
setUserProfile?: React.Dispatch<React.SetStateAction<any>>;
};

export default function SettingsView({
  settings,
  updateSetting,
  resetSettings,
  onLogout,
userProfile,
userFeatures,
favoriteIDs = [],
recentChannelIds = [],
setFavoriteIDs,
setRecentChannelIds,
API_BASE,
setUserProfile,
}: SettingsViewProps) {
  
  const accentLabel =
  settings.accentColor.charAt(0).toUpperCase() +
  settings.accentColor.slice(1);

const themeLabel =
  settings.themeMode.charAt(0).toUpperCase() +
  settings.themeMode.slice(1);
  
  const accountName =
  userProfile?.displayName ||
  userProfile?.username ||
  userProfile?.email?.split("@")?.[0] ||
  "User";

const accountEmail = userProfile?.email || "No email loaded";

const [editingProfile, setEditingProfile] = React.useState(false);
const [profileSaving, setProfileSaving] = React.useState(false);
const [profileMessage, setProfileMessage] = React.useState<string | null>(null);
const { showToast } = useToast();
const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
const [logoutAllBusy, setLogoutAllBusy] = useState(false);
const [showClearFavoritesConfirm, setShowClearFavoritesConfirm] = useState(false);
const [clearFavoritesBusy, setClearFavoritesBusy] = useState(false);
const [showClearRecentConfirm, setShowClearRecentConfirm] = useState(false);
const [clearRecentBusy, setClearRecentBusy] = useState(false);

const [profileForm, setProfileForm] = React.useState({
  username: userProfile?.username || "",
  displayName: userProfile?.displayName || "",
});

React.useEffect(() => {
  setProfileForm({
    username: userProfile?.username || "",
    displayName: userProfile?.displayName || "",
  });
}, [userProfile?.username, userProfile?.displayName]);

const isAdmin = !!userProfile?.roles?.admin;
const isPremium = !!userProfile?.roles?.premium;
const emailVerified = !!userProfile?.emailVerified;
const [showResetSettingsConfirm, setShowResetSettingsConfirm] = useState(false);
const [resetSettingsBusy, setResetSettingsBusy] = useState(false);

const accountRole = isAdmin
  ? "Admin"
  : isPremium
  ? "Premium"
  : "User";

const trustTier = userFeatures?.trustTier || "normal";

const resetHomeLayout = () => {
  updateSetting("homeSectionOrder" as any, [
    "quickActions",
    "rewards",
    "recommended",
    "newFavorites",
    "continueWatching",
    "recent",
    "favoritesLive",
    "liveNow",
  ] as any);

  showToast("Home layout reset.", "success");
};

const clearRecentlyWatched = () => {
  setShowClearRecentConfirm(true);
};

const confirmClearRecentlyWatched = async () => {
  try {
    setClearRecentBusy(true);

    setRecentChannelIds?.([]);

    try {
      localStorage.removeItem("bugz_recent_channels_v1");
    } catch {
      // ignore storage errors
    }

    showToast("Recently watched cleared.", "success");
    setShowClearRecentConfirm(false);
  } catch (err) {
    console.error("Clear recently watched failed:", err);
    showToast("Failed to clear recently watched.", "error");
  } finally {
    setClearRecentBusy(false);
  }
};

const clearFavorites = () => {
  setShowClearFavoritesConfirm(true);
};

const confirmClearFavorites = async () => {
  try {
    setClearFavoritesBusy(true);

    setFavoriteIDs?.([]);

    try {
      localStorage.removeItem("bugz_favorites_v1");
      localStorage.removeItem("favoriteChannels");
    } catch {
      // ignore storage errors
    }

    showToast("Favorites cleared.", "success");
    setShowClearFavoritesConfirm(false);
  } catch (err) {
    console.error("Clear favorites failed:", err);
    showToast("Failed to clear favorites.", "error");
  } finally {
    setClearFavoritesBusy(false);
  }
};

const getAuthHeaders = () => {
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
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "Not available";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "Not available";

  return d.toLocaleString();
};

const securityStatus = emailVerified ? "Good" : "Needs attention";

const accountCreatedLabel = formatDateTime(userProfile?.createdAt);
const accountUpdatedLabel = formatDateTime(userProfile?.updatedAt);

const saveProfileChanges = async () => {
  setProfileSaving(true);
  setProfileMessage(null);

  try {
    const res = await apiFetch("/api/user/profile", {
  method: "PATCH",
  body: JSON.stringify({
    username: profileForm.username,
    displayName: profileForm.displayName,
  }),
});

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setProfileMessage(data?.message || data?.error || "Profile update failed.");
      return;
    }

    setUserProfile?.(data.user);
    setProfileMessage("Profile updated.");
showToast("Profile updated.", "success");
    setEditingProfile(false);
  } catch (err) {
    logger.error("Profile save failed:", err);    setProfileMessage("Request failed. Try again.");
  } finally {
    setProfileSaving(false);
  }
};

const confirmResetSettings = async () => {
  try {
    setResetSettingsBusy(true);

    await resetSettings();

    showToast("All settings reset.", "success");
    setShowResetSettingsConfirm(false);
  } catch (err) {
    console.error("Reset settings failed:", err);
    showToast("Failed to reset settings.", "error");
  } finally {
    setResetSettingsBusy(false);
  }
};

const logoutAllDevices = async () => {
  setShowLogoutAllConfirm(true);
};
   
const confirmLogoutAllDevices = async () => {
  try {
    setLogoutAllBusy(true);

    const res = await fetch(`${API_BASE}/api/user/logout-all`, {
  method: "POST",
  credentials: "include",
  headers: getAuthHeaders(),
});

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      showToast?.(
        data?.message || data?.error || "Logout from all devices failed.",
        "error"
      );
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    document.cookie = "token=; Max-Age=0; path=/; SameSite=Lax";

    showToast?.("Logged out from all devices.", "success");

    setShowLogoutAllConfirm(false);

    onLogout?.();
  } catch (err) {
    console.error("Logout all devices failed:", err);

    showToast?.("Logout from all devices failed.", "error");
  } finally {
    setLogoutAllBusy(false);
  }
};

return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-black text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
            ⚙️ Settings

          <p className="text-sm text-gray-400 mt-1">
            Customize playback, guide behavior, and app preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={resetSettings}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-gray-200 hover:bg-white/20"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        
        <section>
  <div
    className="text-sm font-bold mb-2"
    style={{ color: "var(--bug-accent)" }}
  >
    Account Security Status
  </div>

  <div
    className="rounded-xl overflow-hidden"
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
        🔐 Security Overview
      </div>

      <div className="text-xs text-gray-300/80">
        Current account and session status for this user.
      </div>
    </div>

    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Security Status
        </div>

        <div
          className="text-xl font-black mt-1"
          style={{
            color: emailVerified ? "var(--bug-accent)" : "#fdba74",
          }}
        >
          {securityStatus}
        </div>

        <div className="text-xs text-gray-400 mt-1">
          {emailVerified
            ? "Email is verified."
            : "Email verification is still needed."}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Email Verification
        </div>

        <div
          className="text-xl font-black mt-1"
          style={{
            color: emailVerified ? "var(--bug-accent)" : "#fdba74",
          }}
        >
          {emailVerified ? "Verified" : "Not Verified"}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Role
        </div>

        <div
          className="text-xl font-black mt-1"
          style={{ color: "var(--bug-accent)" }}
        >
          {accountRole}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Trust Tier
        </div>

        <div
          className="text-xl font-black mt-1 capitalize"
          style={{ color: "var(--bug-accent)" }}
        >
          {trustTier}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Account Created
        </div>

        <div className="text-sm font-bold text-white mt-1">
          {accountCreatedLabel}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Last Profile Update
        </div>

        <div className="text-sm font-bold text-white mt-1">
          {accountUpdatedLabel}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3 md:col-span-2 xl:col-span-3">
        <div className="text-xs text-gray-400">
          Current Session
        </div>

        <div
          className="text-sm font-bold mt-1"
          style={{ color: "var(--bug-accent)" }}
        >
          Active on this device
        </div>

        <div className="text-xs text-gray-400 mt-1">
          Use “Logout From All Devices” below to revoke other active tokens.
        </div>
      </div>
    </div>
  </div>
</section>
<section>
  <div className="text-sm font-bold text-cyan-300 mb-2">
    Appearance
  </div>

  <div className="grid gap-3 md:grid-cols-2">
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-bold text-white mb-1">
        Theme mode
      </div>

      <div className="text-xs text-gray-400 mb-3">
        Choose the overall visual style of Bug Eyez View.
      </div>

      <select
        value={settings.themeMode}
        onChange={(e) =>
          updateSetting(
            "themeMode",
            e.target.value as "dark" | "holographic" | "neon"
          )
        }
        className="w-full rounded-lg bg-black border border-white/15 px-3 py-2 text-white"
      >
        <option value="dark">Dark</option>
        <option value="holographic">Holographic</option>
        <option value="neon">Neon</option>
      </select>
    </div>

    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-bold text-white mb-1">
        Accent color
      </div>

      <div className="text-xs text-gray-400 mb-3">
        Choose the main glow color used across the interface.
      </div>

      <select
        value={settings.accentColor}
        onChange={(e) =>
          updateSetting(
            "accentColor",
            e.target.value as "cyan" | "emerald" | "gold" | "purple" | "red"
          )
        }
        className="w-full rounded-lg bg-black border border-white/15 px-3 py-2 text-white"
      >
        <option value="cyan">Cyan</option>
        <option value="emerald">Emerald</option>
        <option value="gold">Gold</option>
        <option value="purple">Purple</option>
        <option value="red">Red</option>
      </select>
    </div>
  </div>
</section>
<section>
  Appearance controls...
</section>

<section>
  Theme Preview...
</section>

<section>
  <div
    className="text-sm font-bold mb-2"
    style={{ color: "var(--bug-accent)" }}
  >
    Account Settings
  </div>

  <div
    className="rounded-xl overflow-hidden"
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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
  <div className="min-w-0 flex-1">
    {!editingProfile ? (
      <>
        <div
          className="font-bold"
          style={{ color: "var(--bug-accent)" }}
        >
          👤 {accountName}
        </div>


        <div className="text-xs text-gray-300/80">
          {accountEmail}
        </div>

        {userProfile?.username && (
          <div className="text-xs text-gray-500 mt-1">
            @{userProfile.username}
          </div>
        )}
      </>
    ) : (
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-gray-400">
            Display Name
          </label>
          <input
            value={profileForm.displayName}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                displayName: e.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none"
            placeholder="Display name"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">
            Username
          </label>
          <input
            value={profileForm.username}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                username: e.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none"
            placeholder="username"
          />
        </div>
      </div>
    )}

    {profileMessage && (
      <div
        className="text-xs mt-2"
        style={{ color: "var(--bug-accent)" }}
      >
        {profileMessage}
      </div>
    )}
  </div>

  <div className="flex gap-2 shrink-0">
    {!editingProfile ? (
      <button
        type="button"
        onClick={() => {
          setProfileMessage(null);
          setEditingProfile(true);
        }}
        className="rounded-lg px-3 py-2 text-xs font-bold"
        style={{
          border: "1px solid var(--bug-accent-border)",
          background: "rgba(0,0,0,0.30)",
          color: "var(--bug-accent)",
        }}
      >
        Edit Profile
      </button>
    ) : (
      <>
        <button
          type="button"
          onClick={saveProfileChanges}
          disabled={profileSaving}
          className="rounded-lg px-3 py-2 text-xs font-bold"
          style={{
            border: "1px solid var(--bug-accent-border)",
            background: "var(--bug-accent)",
            color: "black",
            opacity: profileSaving ? 0.6 : 1,
          }}
        >
          {profileSaving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingProfile(false);
            setProfileMessage(null);
            setProfileForm({
              username: userProfile?.username || "",
              displayName: userProfile?.displayName || "",
            });
          }}
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white"
        >
          Cancel
        </button>
      </>
    )}
  </div>
</div>
    </div>

    <div className="grid gap-3 p-4 md:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Role
        </div>

        <div
          className="text-xl font-black mt-1"
          style={{ color: "var(--bug-accent)" }}
        >
          {accountRole}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Trust Tier
        </div>

        <div
          className="text-xl font-black mt-1 capitalize"
          style={{ color: "var(--bug-accent)" }}
        >
          {trustTier}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Email
        </div>

        <div
          className="text-sm font-black mt-1"
          style={{
            color: emailVerified ? "var(--bug-accent)" : "#fdba74",
          }}
        >
          {emailVerified ? "Verified" : "Not Verified"}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="text-xs text-gray-400">
          Saved Data
        </div>

        <div className="text-sm font-bold text-white mt-1">
          {favoriteIDs.length} favorites · {recentChannelIds.length} recent
        </div>
      </div>
    </div>

    <div className="grid gap-3 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
      <button
        type="button"
        onClick={resetHomeLayout}
        className="rounded-xl px-4 py-3 text-sm font-bold text-left"
        style={{
          border: "1px solid var(--bug-accent-border)",
          background: "rgba(0,0,0,0.30)",
          color: "var(--bug-accent)",
        }}
      >
        Reset Home Layout
        <div className="text-xs text-gray-400 font-normal mt-1">
          Restore default section order.
        </div>
      </button>

      <button
        type="button"
        onClick={clearRecentlyWatched}
        className="rounded-xl px-4 py-3 text-sm font-bold text-left"
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
        }}
      >
        Clear Recently Watched
        <div className="text-xs text-gray-400 font-normal mt-1">
          Remove recent channel history.
        </div>
      </button>

      <button
        type="button"
        onClick={clearFavorites}
        className="rounded-xl px-4 py-3 text-sm font-bold text-left"
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
        }}
      >
        Clear Favorites
        <div className="text-xs text-gray-400 font-normal mt-1">
          Remove all favorite channels.
        </div>
      </button>

  <button
  type="button"
  onClick={() => setShowResetSettingsConfirm(true)}
  className="rounded-xl px-4 py-3 text-sm font-bold text-left"
  style={{
    border: "1px solid rgba(248,113,113,0.45)",
    background: "rgba(248,113,113,0.10)",
    color: "#fca5a5",
  }}
>
  Reset All Settings
  <div className="text-xs text-red-200/70 font-normal mt-1">
    Restore all settings to default.
  </div>
</button>
    </div>
  </div>
</section>

<section>
  <div
    className="text-sm font-bold mb-2"
    style={{ color: "var(--bug-accent)" }}
  >
    Home Personalization
  </div>

  <div className="grid gap-3 md:grid-cols-2">
    <SettingsToggle
      label="Show recommended channels"
      description="Display personalized channel recommendations on Home."
      checked={settings.showHomeRecommended}
      onChange={(value) =>
        updateSetting("showHomeRecommended", value)
      }
    />

    <SettingsToggle
      label="Show favorite programs"
      description="Display live and upcoming programs from your favorite channels."
      checked={settings.showHomeFavorites}
      onChange={(value) =>
        updateSetting("showHomeFavorites", value)
      }
    />

    <SettingsToggle
      label="Show recently watched"
      description="Display your most recently selected channels."
      checked={settings.showHomeRecent}
      onChange={(value) =>
        updateSetting("showHomeRecent", value)
      }
    />

    <SettingsToggle
      label="Show continue watching"
      description="Display your current or last selected channel."
      checked={settings.showHomeContinueWatching}
      onChange={(value) =>
        updateSetting("showHomeContinueWatching", value)
      }
    />

    <SettingsToggle
      label="Show rewards snapshot"
      description="Display credits, favorites, unlocks, and Skip Ads status."
      checked={settings.showHomeRewards}
      onChange={(value) =>
        updateSetting("showHomeRewards", value)
      }
    />
  </div>
</section>

<section>
  Playback & Guide...
</section>
<section>
          <div className="text-sm font-bold text-cyan-300 mb-2">
            Playback & Guide
          </div>

          <div className="space-y-3">
            <SettingsToggle
              label="Hide unstable channels"
              description="Hide disabled, suppressed, or unstable channels from the guide."
              checked={settings.hideUnstableChannels}
              onChange={(value) =>
                updateSetting("hideUnstableChannels", value)
              }
            />

            <SettingsToggle
              label="Show locked YouTube channels"
              description="Show locked YouTube channels in the guide so they can be unlocked with credits."
              checked={settings.showLockedYoutubeChannels}
              onChange={(value) =>
                updateSetting("showLockedYoutubeChannels", value)
              }
            />

            <SettingsToggle
              label="Show Now / Next banner"
              description="Show a short banner when selecting a program."
              checked={settings.showNowNextBanner}
              onChange={(value) =>
                updateSetting("showNowNextBanner", value)
              }
            />

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
  <div className="text-sm font-bold text-white mb-1">
    Guide density
  </div>

  <div className="text-xs text-gray-400 mb-3">
    Choose how tightly the channel guide is displayed.
  </div>

  <select
    value={settings.guideDensity}
    onChange={(e) =>
      updateSetting(
        "guideDensity",
        e.target.value as "comfortable" | "compact" | "ultra"
      )
    }
    className="w-full rounded-lg bg-black border border-white/15 px-3 py-2 text-white"
  >
    <option value="comfortable">Comfortable</option>
    <option value="compact">Compact</option>
    <option value="ultra">Ultra Compact</option>
  </select>
</div>
          </div>
        </section>

        <section>
          <div className="text-sm font-bold text-emerald-300 mb-2">
            Startup
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-bold text-white mb-2">
              Default start view
            </div>

            <select
              value={settings.defaultStartView}
              onChange={(e) =>
                updateSetting(
                  "defaultStartView",
                  e.target.value as BugEyezSettings["defaultStartView"]
                )
              }
              className="w-full rounded-lg bg-black border border-white/15 px-3 py-2 text-white"
            >
              <option value="live">Live TV</option>
              <option value="home">Home</option>
              <option value="profile">Profile</option>
              <option value="settings">Settings</option>
            </select>
          </div>
        </section>

        <section>
  <div className="text-sm font-bold text-red-300 mb-2">
    Account
  </div>

  <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 space-y-3">
    {/* LOGOUT CURRENT DEVICE */}
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-red-200">
          Logout
        </div>

        <div className="text-xs text-red-100/60">
          Sign out of Bug Eyez View on this device.
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-300/30 text-red-200 font-bold hover:bg-red-500/30"
      >
        Logout
      </button>
    </div>

    {/* LOGOUT ALL DEVICES */}
    <div className="border-t border-red-300/20 pt-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-red-200">
          Logout From All Devices
        </div>

        <div className="text-xs text-red-100/60">
          Revoke all current login tokens and require a fresh login.
        </div>
      </div>

      <button
        type="button"
        onClick={logoutAllDevices}
        className="px-4 py-2 rounded-lg font-bold"
        style={{
          border: "1px solid rgba(248,113,113,0.45)",
          background: "rgba(248,113,113,0.10)",
          color: "#fca5a5",
        }}
      >
        Logout All
      </button>
    </div>
  </div>
</section>
 
 {showLogoutAllConfirm && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
    <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-950 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-white">
        Log out from all devices?
      </h3>

      <p className="mt-3 text-sm text-slate-300">
        This will log you out everywhere. You will need to log back in on every
        device.
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={logoutAllBusy}
          onClick={() => setShowLogoutAllConfirm(false)}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={logoutAllBusy}
          onClick={confirmLogoutAllDevices}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {logoutAllBusy ? "Logging out..." : "Log out all"}
        </button>
      </div>
    </div>
  </div>
)}     

   {showResetSettingsConfirm && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
    <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-950 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-white">
        Reset all settings?
      </h3>

      <p className="mt-3 text-sm text-slate-300">
        This will restore your settings back to default. You can customize them
        again afterward.
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={resetSettingsBusy}
          onClick={() => setShowResetSettingsConfirm(false)}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={resetSettingsBusy}
          onClick={confirmResetSettings}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {resetSettingsBusy ? "Resetting..." : "Reset settings"}
        </button>
      </div>
    </div>
  </div>
)}

{showClearFavoritesConfirm && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
    <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-950 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-white">
        Clear all favorite channels?
      </h3>

      <p className="mt-3 text-sm text-slate-300">
        This will remove every channel from your favorites list.
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={clearFavoritesBusy}
          onClick={() => setShowClearFavoritesConfirm(false)}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={clearFavoritesBusy}
          onClick={confirmClearFavorites}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {clearFavoritesBusy ? "Clearing..." : "Clear favorites"}
        </button>
      </div>
    </div>
  </div>
)}

{showClearRecentConfirm && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
    <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-950 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-white">
        Clear recently watched?
      </h3>

      <p className="mt-3 text-sm text-slate-300">
        This will remove your recently watched channel history from this device.
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          disabled={clearRecentBusy}
          onClick={() => setShowClearRecentConfirm(false)}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={clearRecentBusy}
          onClick={confirmClearRecentlyWatched}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {clearRecentBusy ? "Clearing..." : "Clear history"}
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
}