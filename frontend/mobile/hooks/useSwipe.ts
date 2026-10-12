import { useRef } from "react";

export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 50
) {
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    startX.current = clientX;
  };

  const onTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (startX.current === null) return;
    const clientX =
      "changedTouches" in e
        ? e.changedTouches[0].clientX
        : (e as React.MouseEvent).clientX;
    const delta = clientX - startX.current;
    if (Math.abs(delta) > threshold) {
      if (delta < 0) onSwipeLeft();
      else onSwipeRight();
    }
    startX.current = null;
  };

  return { onTouchStart, onTouchEnd };
}
