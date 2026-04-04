"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";

interface DisplayData {
  supported: boolean;
  screenOn: boolean;
  brightnessPercent: number;
  maxBrightness: number | null;
  autoSleepEnabled: boolean;
  idleTimeoutSeconds: number;
  lastOnBrightnessPercent: number;
}

const TIMEOUT_OPTIONS = [15, 30, 60, 120, 300];

export function DisplayPanel({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<DisplayData | null>(null);
  const [busy, setBusy] = useState(false);

  const backTap = useTap(onBack);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/system/display", { cache: "no-store" });
      if (res.ok) {
        setData((await res.json()) as DisplayData);
      }
    } finally {
      // keep latest known state even if refresh fails
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void fetchData();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchData();
    }, 10000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [fetchData]);

  const postAction = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch("/api/system/display", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setData((await res.json()) as DisplayData);
        }
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const brightness = data?.brightnessPercent ?? 100;
  const screenOn = data?.screenOn ?? true;
  const autoSleepEnabled = data?.autoSleepEnabled ?? true;
  const timeout = data?.idleTimeoutSeconds ?? 30;
  const statusCopy = useMemo(() => {
    if (!data?.supported) {
      return {
        title: "Display controls unavailable",
        subtitle: "This runtime cannot access the panel backlight from the app.",
        tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
      };
    }

    return {
      title: screenOn ? "Screen is on" : "Screen is off",
      subtitle: screenOn
        ? `Brightness ${brightness}% · Auto-sleep ${autoSleepEnabled ? `${timeout}s` : "off"}`
        : `Tap the panel to wake it. Last brightness ${data.lastOnBrightnessPercent}%`,
      tone: screenOn
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
        : "border-amber-500/25 bg-amber-500/10 text-amber-200",
    };
  }, [autoSleepEnabled, brightness, data, screenOn, timeout]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <button
          {...backTap}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-foreground/50 transition-transform active:scale-90"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <h1 className="text-[20px] font-medium text-foreground">Screen & brightness</h1>
      </div>

      <div className="perf-scroll-region flex-1 space-y-5 overflow-y-auto scrollbar-hide">
        <div className={cn("rounded-2xl border px-4 py-4", statusCopy.tone)}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              screenOn ? "bg-white/10" : "bg-black/20"
            )}>
              <Icon name="power" size={18} />
            </div>
            <div>
              <p className="text-[14px] font-semibold">{statusCopy.title}</p>
              <p className="mt-1 text-[12px] text-current/75">{statusCopy.subtitle}</p>
            </div>
          </div>
        </div>

        <section className="perf-section">
          <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wider text-foreground/40">
            Display controls
          </h2>
          <div className="space-y-4 rounded-2xl border border-border/15 bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-foreground">Screen power</p>
                <p className="text-[12px] text-foreground/40">Turn the backlight on or off instantly.</p>
              </div>
              <button
                onClick={() => void postAction({ action: "set_power", on: !screenOn })}
                disabled={busy || !data?.supported}
                className={cn(
                  "rounded-xl px-4 py-2 text-[13px] font-medium transition-colors",
                  screenOn ? "bg-amber-500/15 text-amber-300" : "bg-accent text-black",
                  (!data?.supported || busy) && "opacity-50"
                )}
              >
                {screenOn ? "Turn off" : "Turn on"}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px] text-foreground/60">
                <span>Brightness</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={brightness}
                disabled={busy || !data?.supported}
                onChange={(event) => void postAction({
                  action: "set_brightness",
                  brightnessPercent: Number(event.target.value),
                })}
                className="w-full h-1.5 rounded-full appearance-none bg-surface-raised [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
              />
              <p className="text-[11px] text-foreground/35">
                Setting brightness to 0 turns the backlight off while keeping the app running.
              </p>
            </div>
          </div>
        </section>

        <section className="perf-section">
          <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wider text-foreground/40">
            Auto-sleep
          </h2>
          <div className="space-y-4 rounded-2xl border border-border/15 bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-foreground">Auto-sleep</p>
                <p className="text-[12px] text-foreground/40">Turn the backlight off after inactivity.</p>
              </div>
              <button
                onClick={() => void postAction({ action: "set_auto_sleep", enabled: !autoSleepEnabled })}
                disabled={busy || !data?.supported}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  autoSleepEnabled ? "bg-accent" : "bg-surface-raised",
                  (!data?.supported || busy) && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    autoSleepEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Idle timeout</p>
              <div className="flex flex-wrap gap-2">
                {TIMEOUT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => void postAction({ action: "set_idle_timeout", idleTimeoutSeconds: option })}
                    disabled={busy || !data?.supported || !autoSleepEnabled}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      timeout === option ? "bg-accent text-black" : "bg-surface-raised text-foreground/55",
                      (!data?.supported || busy || !autoSleepEnabled) && "opacity-50"
                    )}
                  >
                    {option}s
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-foreground/35">
                Any touch wakes the screen again.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
