import { useEffect, useRef } from "react";

export function useAmbientAudio(src = "/sounds/holo-ambience.mp3", volume = 0.25) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
    };
  }, [src, volume]);
}
