"use client";

import { useState, useEffect } from "react";
import { formatTime, formatDate } from "@/lib/utils";

export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const time = formatTime(now);
  const date = formatDate(now);

  return { time, date };
}
