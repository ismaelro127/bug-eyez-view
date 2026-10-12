import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/apiFetch";


export default function CheckEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pendingVerificationEmail") || "";
    setEmail(pendingEmail);
  }, []);

  const resendVerification = async () => {
    setMsg(null);

    if (!email) {
      setMsg("Enter your email first.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/resend-verification", {
  method: "POST",
  body: JSON.stringify({ email }),
});

const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || data.error || "Failed to resend email.");
        return;
      }

      setMsg(data.message || "Verification email sent again.");
    } catch {
      setMsg("Network or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-cyan-300 mb-3">
          Check Your Email
        </h1>

        <p className="text-sm text-gray-300 mb-4">
          Your account was created. We sent a verification link to your email.
          Click that link before logging in.
        </p>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-3 px-3 py-2 rounded bg-black/50 border border-white/20"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        {msg && (
          <div className="mb-3 text-sm text-cyan-300 bg-cyan-900/20 p-2 rounded">
            {msg}
          </div>
        )}

        <button
          onClick={resendVerification}
          disabled={loading}
          className="w-full py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold disabled:opacity-50"
        >
          {loading ? "Sending..." : "Resend Verification Email"}
        </button>

        <button
          onClick={() => router.push("/login")}
          className="w-full mt-3 py-2 rounded bg-white/10 hover:bg-white/20 text-white"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}