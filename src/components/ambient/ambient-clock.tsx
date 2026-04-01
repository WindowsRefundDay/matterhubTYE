"use client";

import { useClock } from "@/hooks/use-clock";

export function AmbientClock({ active = true }: { active?: boolean }) {
  const { time, date, ready } = useClock(active);

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="flex items-baseline gap-1">
        <span className="text-[120px] leading-none font-extralight tracking-tight text-foreground tabular-nums">
          {time?.hours ?? "--"}
        </span>
        <span className="text-[120px] leading-none font-extralight tracking-tight text-foreground/40">
          :
        </span>
        <span className="text-[120px] leading-none font-extralight tracking-tight text-foreground tabular-nums">
          {time?.minutes ?? "--"}
        </span>
        <span className="text-[28px] leading-none font-light text-foreground/30 ml-2 self-end mb-5 min-w-[2.5rem]">
          {time?.period ?? ""}
        </span>
      </div>
      <p className="min-h-[27px] text-[18px] font-light text-foreground/40 tracking-wide">
        {ready ? date : ""}
      </p>
    </div>
  );
}
