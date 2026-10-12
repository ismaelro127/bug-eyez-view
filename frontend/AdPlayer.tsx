import React, { useState } from "react";

interface AdPlayerProps {
  onFinished: () => void;
}

export default function AdPlayer({ onFinished }: AdPlayerProps) {
  const [skipped, setSkipped] = useState(false);

  const handleSkip = () => {
    setSkipped(true);
    onFinished();
  };

  if (skipped) {
    return (
      <div className="mt-6 p-4 border border-green-700 rounded text-green-400">
        ✅ Ad skipped — coins added!
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 border border-gray-700 rounded">
      <h4 className="mb-2">Watch this ad (fallback) to earn coins:</h4>
      <video
        src="/ads/sample-ad.mp4"
        controls
        autoPlay
        onEnded={onFinished}
        className="w-full rounded"
      />
      <button
        onClick={handleSkip}
        className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded"
      >
        ⏩ Skip Ad (Dev)
      </button>
    </div>
  );
}
