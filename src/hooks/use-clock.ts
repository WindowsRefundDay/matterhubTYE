"use client";

import { useState, useEffect } from "react";
import { formatTime, formatDate } from "@/lib/utils";

export function useClock(enabled = true) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncNow = () => setNow(new Date());
    syncNow();
    const interval = setInterval(syncNow, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled]);

  const time = now ? formatTime(now) : null;
  const date = now ? formatDate(now) : "";

  return { time, date, ready: now !== null };
}
