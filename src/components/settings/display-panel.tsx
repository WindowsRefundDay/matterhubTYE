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
  dimAfterSeconds: number;
  turnOffAfterSeconds: number;
  preferredBrightnessPercent: number;
  dimmedBrightnessPercent: number;
  lastOnBrightnessPercent: number;
  keepAwakeDuringDay: boolean;
  dayStartsAt: string;
  nightStartsAt: string;
}

const TIMEOUT_OPTIONS = [15, 30, 60, 120, 300];
const DAY_START_OPTIONS = ["06:00", "07:00", "08:00", "09:00"];
const NIGHT_START_OPTIONS = ["19:00", "20:00", "21:00", "22:00", "23:00"];

function formatClock(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

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
    } catch {
      // preserve last known data on refresh failure
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
  const dimAfterSeconds = data?.dimAfterSeconds ?? 30;
  const turnOffAfterSeconds = data?.turnOffAfterSeconds ?? 30;
  const dimmedBrightnessPercent = data?.dimmedBrightnessPercent ?? 15;
  const keepAwakeDuringDay = data?.keepAwakeDuringDay ?? false;
  const dayStartsAt = data?.dayStartsAt ?? "07:00";
  const nightStartsAt = data?.nightStartsAt ?? "22:00";

  const statusCopy = useMemo(() => {
    if (!data?.supported) {
      return {
        title: "Display controls unavailable",
        subtitle: "This runtime cannot access the panel backlight from the app.",
        tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
      };
    }

    if (!screenOn) {
      return {
        title: "Screen is off",
        subtitle: `Tap the panel to wake it. It will restore to ${data.lastOnBrightnessPercent}% brightness.`,
        tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
      };
    }

    return {
      title: "Screen is on",
      subtitle: `Brightness ${brightness}% · Dim after ${dimAfterSeconds}s · Off ${turnOffAfterSeconds}s later`,
      tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    };
  }, [brightness, data, dimAfterSeconds, screenOn, turnOffAfterSeconds]);

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
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                screenOn ? "bg-white/10" : "bg-black/20"
              )}
            >
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
                <span>Daytime brightness</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={brightness}
                disabled={busy || !data?.supported}
                onChange={(event) =>
                  void postAction({
                    action: "set_brightness",
                    brightnessPercent: Number(event.target.value),
                  })
                }
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
            Auto-dim & sleep
          </h2>
          <div className="space-y-4 rounded-2xl border border-border/15 bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-foreground">Auto-dim</p>
                <p className="text-[12px] text-foreground/40">Dim first, then turn the backlight fully off after more idle time.</p>
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
              <div className="flex items-center justify-between text-[13px] text-foreground/60">
                <span>Dim brightness</span>
                <span>{dimmedBrightnessPercent}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={80}
                value={dimmedBrightnessPercent}
                disabled={busy || !data?.supported || !autoSleepEnabled}
                onChange={(event) =>
                  void postAction({
                    action: "set_dimmed_brightness",
                    dimmedBrightnessPercent: Number(event.target.value),
                  })
                }
                className="w-full h-1.5 rounded-full appearance-none bg-surface-raised [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Dim after</p>
              <div className="flex flex-wrap gap-2">
                {TIMEOUT_OPTIONS.map((option) => (
                  <button
                    key={`dim-${option}`}
                    onClick={() =>
                      void postAction({ action: "set_dim_after", dimAfterSeconds: option })
                    }
                    disabled={busy || !data?.supported || !autoSleepEnabled}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      dimAfterSeconds === option
                        ? "bg-accent text-black"
                        : "bg-surface-raised text-foreground/55",
                      (!data?.supported || busy || !autoSleepEnabled) && "opacity-50"
                    )}
                  >
                    {option}s
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Turn off after dimming</p>
              <div className="flex flex-wrap gap-2">
                {TIMEOUT_OPTIONS.map((option) => (
                  <button
                    key={`off-${option}`}
                    onClick={() =>
                      void postAction({
                        action: "set_turn_off_after",
                        turnOffAfterSeconds: option,
                      })
                    }
                    disabled={busy || !data?.supported || !autoSleepEnabled}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      turnOffAfterSeconds === option
                        ? "bg-accent text-black"
                        : "bg-surface-raised text-foreground/55",
                      (!data?.supported || busy || !autoSleepEnabled) && "opacity-50"
                    )}
                  >
                    {option}s
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-foreground/35">
                Any touch restores the regular brightness immediately.
              </p>
            </div>
          </div>
        </section>

        <section className="perf-section">
          <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wider text-foreground/40">
            Daytime behavior
          </h2>
          <div className="space-y-4 rounded-2xl border border-border/15 bg-surface/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-foreground">Keep screen awake during day</p>
                <p className="text-[12px] text-foreground/40">Ignore idle dimming between your daytime hours.</p>
              </div>
              <button
                onClick={() =>
                  void postAction({
                    action: "set_keep_awake_during_day",
                    enabled: !keepAwakeDuringDay,
                  })
                }
                disabled={busy || !data?.supported}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  keepAwakeDuringDay ? "bg-accent" : "bg-surface-raised",
                  (!data?.supported || busy) && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    keepAwakeDuringDay ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Day starts</p>
              <div className="flex flex-wrap gap-2">
                {DAY_START_OPTIONS.map((option) => (
                  <button
                    key={`day-${option}`}
                    onClick={() =>
                      void postAction({
                        action: "set_day_window",
                        dayStartsAt: option,
                        nightStartsAt,
                      })
                    }
                    disabled={busy || !data?.supported || !keepAwakeDuringDay}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      dayStartsAt === option
                        ? "bg-accent text-black"
                        : "bg-surface-raised text-foreground/55",
                      (!data?.supported || busy || !keepAwakeDuringDay) && "opacity-50"
                    )}
                  >
                    {formatClock(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-foreground">Night starts</p>
              <div className="flex flex-wrap gap-2">
                {NIGHT_START_OPTIONS.map((option) => (
                  <button
                    key={`night-${option}`}
                    onClick={() =>
                      void postAction({
                        action: "set_day_window",
                        dayStartsAt,
                        nightStartsAt: option,
                      })
                    }
                    disabled={busy || !data?.supported || !keepAwakeDuringDay}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      nightStartsAt === option
                        ? "bg-accent text-black"
                        : "bg-surface-raised text-foreground/55",
                      (!data?.supported || busy || !keepAwakeDuringDay) && "opacity-50"
                    )}
                  >
                    {formatClock(option)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-foreground/35">
                Daytime awake window: {formatClock(dayStartsAt)} → {formatClock(nightStartsAt)}.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
