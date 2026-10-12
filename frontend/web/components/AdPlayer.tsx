import React, { useRef, useState } from "react";

type Props = {
  onComplete: () => void;
};

const RewardedAdPlayer: React.FC<Props> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ended, setEnded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src="/ads/reward_01.mp4"
        autoPlay
        playsInline
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        className="w-full h-full object-contain"
        onEnded={() => {
          setEnded(true);
          onComplete();
        }}
      />

      {!ended && (
        <div className="absolute bottom-4 text-xs text-white/70">
          Ad playing… credits unlock after completion
        </div>
      )}
    </div>
  );
};

export default RewardedAdPlayer;
