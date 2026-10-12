import { useRef, useState } from "react";

export const useSwipe = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
  const startX = useRef(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = "touches" in e ? e.touches[0].clientX : (e as any).clientX;
    startX.current = x;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging) return;
    const x = "touches" in e ? e.touches[0].clientX : (e as any).clientX;
    const delta = x - startX.current;
    if (Math.abs(delta) > 80) {
      if (delta > 0) onSwipeRight();
      else onSwipeLeft();
      setDragging(false);
    }
  };

  const onTouchEnd = () => setDragging(false);

  return { onTouchStart, onTouchMove, onTouchEnd };
};
