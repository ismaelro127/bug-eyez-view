import React, { useState } from "react";
import { useRouter } from "next/router";
import { logger } from "../web/utils/logger";
import { apiFetch } from "../lib/apiFetch";


type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("admin@bugz.com");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

const handleAuth = async () => {
  setMsg(null);

  if (!email || !password) {
    setMsg("Email and password are required");
    return;
  }

  if (mode === "register" && password.length < 8) {
    setMsg("Password must be at least 8 characters");
    return;
  }

  setLoading(true);

  try {
    const endpoint =
  mode === "login"
    ? "/api/auth/login"
    : "/api/auth/register";
    const body =
      mode === "login"
        ? { email, password }
        : { email, password, username };

const res = await apiFetch(endpoint, {
  method: "POST",
  body: JSON.stringify(body),
});

const data = await res.json().catch(() => ({}));
    if (!res.ok) {
  if (data.error === "EMAIL_NOT_VERIFIED") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.setItem("pendingVerificationEmail", email);
    router.push("/check-email");
    return;
  }

  setMsg(
    data.message ||
      data.error ||
      `${mode === "login" ? "Login" : "Registration"} failed`
  );
  return;
}

// REGISTER FLOW: do not store token, do not go home
if (mode === "register") {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  localStorage.setItem("pendingVerificationEmail", email);
  router.push("/check-email");
  return;
}

// LOGIN FLOW ONLY
const token = data.token || data.accessToken;

if (!token) {
  setMsg("No token returned from server");
  return;
}

localStorage.setItem("token", token);

if (data.refreshToken) {
  localStorage.setItem("refreshToken", data.refreshToken);
}

if (data.user) {
  localStorage.setItem("user", JSON.stringify(data.user));
}

document.cookie = `token=${token}; path=/;`;

setMsg(null);
router.push("/");
  } catch (e: any) {
    logger.error("Auth error", e);
    setMsg("Network or server error");
  } finally {
    setLoading(false);
  }
};

const isRegister = mode === "register";
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md bg-white/5 rounded-xl p-6 shadow-xl border border-white/10">
        <h1 className="text-2xl font-bold mb-2">
          Bug Eyez View
        </h1>

        <div className="text-sm text-gray-400 mb-5">
          {isRegister ? "Create your account" : "Login to your account"}
        </div>

        <div className="flex mb-5 rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => {
              setMode("login");
              setMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-emerald-500 text-black"
                : "bg-black/40 text-gray-300 hover:bg-white/10"
            }`}
          >
            Login
          </button>

          <button
            onClick={() => {
              setMode("register");
              setMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold ${
              mode === "register"
                ? "bg-cyan-400 text-black"
                : "bg-black/40 text-gray-300 hover:bg-white/10"
            }`}
          >
            Create Account
          </button>
        </div>

        {msg && (
          <div className="mb-3 text-sm text-red-400 bg-red-900/30 p-2 rounded">
            {msg}
          </div>
        )}

        {isRegister && (
          <>
            <label className="block text-sm mb-1">Username</label>
            <input
              className="w-full mb-3 px-3 py-2 rounded bg-black/50 border border-white/20"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="BugEyezUser"
            />
          </>
        )}

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-3 px-3 py-2 rounded bg-black/50 border border-white/20"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className="block text-sm mb-1">Password</label>

<div className="relative mb-4">
  <input
    className="w-full px-3 py-2 pr-12 rounded bg-black/50 border border-white/20"
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder={isRegister ? "Minimum 8 characters" : "Password"}
  />

  <button
    type="button"
    onClick={() => setShowPassword((v) => !v)}
    className="
      absolute right-2 top-1/2 -translate-y-1/2
      px-2 py-1 rounded
      text-xs text-gray-300
      hover:text-white hover:bg-white/10
    "
  >
    {showPassword ? "Hide" : "Show"}
  </button>
</div>

        <button
          className={`w-full py-2 rounded font-semibold ${
            isRegister
              ? "bg-cyan-400 hover:bg-cyan-300 text-black"
              : "bg-emerald-500 hover:bg-emerald-400 text-black"
          }`}
          onClick={handleAuth}
          disabled={loading}
        >
          {loading
            ? isRegister
              ? "Creating account..."
              : "Logging in..."
            : isRegister
            ? "Create Account"
            : "Login"}
        </button>

        <div className="mt-4 text-center text-sm text-gray-400">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <button
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setMsg(null);
            }}
            className="text-emerald-400 hover:underline"
          >
            {isRegister ? "Login" : "Create one"}
          </button>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="text-xs text-white/60 text-center leading-relaxed">
            By continuing, you agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              Privacy Policy
            </a>.
          </div>
        </div>
      </div>
    </div>
  );
}