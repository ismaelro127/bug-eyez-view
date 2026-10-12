import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ThreePanelLayout from "../web/components/ThreePanelLayout";

export default function HomePage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);

  // ⬇️ Prevents SSR flash
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ⬇️ Login check
  useEffect(() => {
    if (!hydrated) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    } else {
      setChecking(false);
    }
  }, [hydrated, router]);

  // ⬇️ Block ALL SSR UI
  if (!hydrated || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  return <ThreePanelLayout />;
}
