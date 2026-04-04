import { useRef } from "react";

const DRAG_THRESHOLD = 8;

/**
 * Returns pointer event handlers that fire `callback` only when the pointer
 * hasn't moved enough to be considered a scroll/drag. Prevents accidental
 * taps when the user is trying to scroll a list.
 */
export function useTap(callback: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown(e: React.PointerEvent) {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp(e: React.PointerEvent) {
      if (!start.current) return;
      const dx = Math.abs(e.clientX - start.current.x);
      const dy = Math.abs(e.clientY - start.current.y);
      start.current = null;
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) callback();
    },
    onPointerLeave() {
      start.current = null;
    },
  };
}
