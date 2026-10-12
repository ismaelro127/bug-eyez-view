import { useState } from "react";
import { awardAdCredits } from "../../lib/api";

export default function WatchAdButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleWatchAd = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // 🎬 Simulated ad completion
      const adSessionId = `ad-${Date.now()}`;

      const result = await awardAdCredits(adSessionId);

      setMessage(`✅ Earned credits! Total: ${result.credits}`);
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleWatchAd}
        disabled={loading}
        className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "Watching ad…" : "Watch Ad (+5 Credits)"}
      </button>

      {message && (
        <div className="text-sm text-white/80">{message}</div>
      )}
    </div>
  );
}
