"use client";

import { useEffect, useRef, useCallback } from "react";

export function useIdleTimer(onIdle: () => void, timeout = 30000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onIdle(), timeout);
  }, [onIdle, timeout]);

  useEffect(() => {
    const events = ["pointerdown", "pointermove", "keydown"] as const;
    const handler = () => reset();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);

  return { reset };
}
