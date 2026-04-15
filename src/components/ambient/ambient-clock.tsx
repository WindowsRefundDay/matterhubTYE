"use client";

import { useClock } from "@/hooks/use-clock";

export function AmbientClock({ active = true }: { active?: boolean }) {
  const { time, date, ready } = useClock(active);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center animate-pulse text-[var(--minimalist-fg)] transition-colors duration-500 ease-out">
        <span className="font-serif text-[136px] leading-none tracking-[-0.04em] text-current opacity-20">
          --:--
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-7 text-[var(--minimalist-fg)] transition-colors duration-500 ease-out">
      <div className="relative flex w-full items-center justify-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="font-serif text-[136px] font-normal leading-[0.78] tracking-[-0.04em] tabular-nums">
            {time?.hours}
          </span>
          <span
            aria-hidden="true"
            className="clock-separator mx-1 flex h-[82px] flex-col items-center justify-center gap-5 self-center"
          >
            <span className="block h-2 w-2 rounded-[3px] border border-current bg-current" />
            <span className="block h-2 w-2 rounded-[3px] border border-current bg-current" />
          </span>
          <span className="font-serif text-[136px] font-normal leading-[0.78] tracking-[-0.04em] tabular-nums">
            {time?.minutes}
          </span>
        </div>
        <div className="absolute left-[calc(50%+164px)] top-1/2 flex -translate-y-1/2">
          <span className="rounded-[4px] border border-current bg-background px-2 py-1 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-current opacity-70 transition-colors duration-500 ease-out">
            {time?.period}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px w-10 bg-current opacity-[0.18]" />
        <p className="font-mono text-[11px] font-medium uppercase leading-[1.6] tracking-[0.16em] text-current opacity-70">
          {date}
        </p>
        <div className="h-px w-10 bg-current opacity-[0.18]" />
      </div>
    </div>
  );
}
