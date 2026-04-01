"use client";

import { useClock } from "@/hooks/use-clock";

export function AmbientClock() {
  const { time, date } = useClock();

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="flex items-baseline gap-1">
        <span className="text-[120px] leading-none font-extralight tracking-tight text-foreground tabular-nums">
          {time.hours}
        </span>
        <span className="text-[120px] leading-none font-extralight tracking-tight text-foreground/40 animate-pulse" style={{ willChange: "opacity", transform: "translateZ(0)" }}>
          :
        </span>
        <span className="text-[120px] leading-none font-extralight tracking-tight text-foreground tabular-nums">
          {time.minutes}
        </span>
        <span className="text-[28px] leading-none font-light text-foreground/30 ml-2 self-end mb-5">
          {time.period}
        </span>
      </div>
      <p className="text-[18px] font-light text-foreground/40 tracking-wide">
        {date}
      </p>
    </div>
  );
}
