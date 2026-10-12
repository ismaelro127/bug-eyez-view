import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/apiFetch";


export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [msg, setMsg] = useState("Verifying your email...");

  useEffect(() => {
    if (!router.isReady) return;

    if (!token || Array.isArray(token)) {
      setStatus("error");
      setMsg("Missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        const res = await apiFetch(
  `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
  {
    method: "GET",
  }
);

const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMsg(data.message || data.error || "Verification failed.");
          return;
        }

        localStorage.removeItem("pendingVerificationEmail");

        setStatus("success");
        setMsg(data.message || "Email verified successfully. You can now log in.");
      } catch {
        setStatus("error");
        setMsg("Network or server error.");
      }
    };

    verify();
  }, [router.isReady, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl p-6 text-center shadow-xl">
        <h1
          className={`text-2xl font-bold mb-3 ${
            status === "success"
              ? "text-emerald-300"
              : status === "error"
              ? "text-red-300"
              : "text-cyan-300"
          }`}
        >
          {status === "success"
            ? "Email Verified"
            : status === "error"
            ? "Verification Failed"
            : "Verifying Email"}
        </h1>

        <p className="text-gray-300 mb-5">{msg}</p>

        {status === "success" && (
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
          >
            Go to Login
          </button>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/check-email")}
            className="w-full py-2 rounded bg-white/10 hover:bg-white/20 text-white"
          >
            Resend Verification
          </button>
        )}
      </div>
    </div>
  );
}