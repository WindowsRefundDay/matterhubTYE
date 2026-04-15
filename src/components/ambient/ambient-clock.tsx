"use client";

import { useClock } from "@/hooks/use-clock";

export function AmbientClock({ active = true }: { active?: boolean }) {
  const { time, date, ready } = useClock(active);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center animate-pulse">
        <span className="font-serif text-[140px] leading-none text-muted/20">--:--</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[140px] leading-[0.8] tracking-[-0.04em] text-foreground tabular-nums">
            {time?.hours}
          </span>
          <span className="font-serif text-[140px] leading-[0.8] text-muted/30">
            :
          </span>
          <span className="font-serif text-[140px] leading-[0.8] tracking-[-0.04em] text-foreground tabular-nums">
            {time?.minutes}
          </span>
        </div>
        <div className="ml-4 self-center flex flex-col items-start">
           <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted bg-muted/5 px-1.5 py-1 rounded-sm border border-border/50">
            {time?.period}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="h-[1px] w-8 bg-border/40" />
        <p className="font-sans text-[13px] font-bold uppercase tracking-[0.25em] text-muted">
          {date}
        </p>
        <div className="h-[1px] w-8 bg-border/40" />
      </div>
    </div>
  );
}
