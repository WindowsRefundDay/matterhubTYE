"use client";

import { useCallback, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { useDisplayState } from "@/hooks/use-display-state";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";
import type { DisplayAction } from "@/types/system";

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
  const {
    data,
    busy,
    performAction,
  } = useDisplayState({ pollMs: 10000 });

  const backTap = useTap(onBack);

  const postAction = useCallback(
    async (action: DisplayAction) => {
      try {
        await performAction(action);
      } catch {
        // preserve last known data on action failure
      }
    },
    [performAction]
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
    <div className="relative flex h-full flex-col bg-background">
      <div className="flex items-center gap-4 px-6 pt-8 pb-4">
        <button
          {...backTap}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition-transform active:scale-90"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <h1 className="font-serif text-[28px] tracking-tight text-foreground">Display</h1>
      </div>

      <div className="perf-scroll-region flex-1 space-y-10 overflow-y-auto scrollbar-hide px-6 pb-32">
        <div className={cn("rounded-lg border px-5 py-5", statusCopy.tone)}>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg border bg-white/50"
              )}
            >
              <Icon name="power" size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold uppercase tracking-wider">{statusCopy.title}</p>
              <p className="mt-1 text-[12px] opacity-80">{statusCopy.subtitle}</p>
            </div>
          </div>
        </div>

        <section className="perf-section">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
            Hardware Control
          </h2>
          <div className="space-y-6 rounded-lg border border-border bg-muted/5 p-5">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-[15px] font-medium text-foreground">Backlight Power</p>
                <p className="text-[12px] text-muted">Toggle the physical panel output.</p>
              </div>
              <button
                onClick={() => void postAction({ action: "set_power", on: !screenOn })}
                disabled={busy || !data?.supported}
                className={cn(
                  "rounded-md px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95",
                  screenOn ? "bg-background border border-border text-foreground" : "bg-foreground text-background",
                  (!data?.supported || busy) && "opacity-30 active:scale-100"
                )}
              >
                {screenOn ? "Power Off" : "Power On"}
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-foreground">Luminance</p>
                <span className="text-[12px] font-mono text-muted bg-background px-2 py-0.5 border border-border rounded-sm">{brightness}%</span>
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
                className="w-full h-1.5 rounded-full appearance-none bg-border/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm"
              />
              <p className="text-[11px] text-muted italic">
                A setting of 0% will completely darken the environment.
              </p>
            </div>
          </div>
        </section>

        <section className="perf-section">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
            Energy Management
          </h2>
          <div className="space-y-8 rounded-lg border border-border bg-muted/5 p-5">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-[15px] font-medium text-foreground">Intelligent Dimming</p>
                <p className="text-[12px] text-muted">Automated reduction of power during idle.</p>
              </div>
              <button
                onClick={() => void postAction({ action: "set_auto_sleep", enabled: !autoSleepEnabled })}
                disabled={busy || !data?.supported}
                className={cn(
                  "w-10 h-6 rounded-md relative shrink-0 transition-colors duration-200",
                  autoSleepEnabled ? "bg-foreground" : "bg-muted/10 border border-border",
                  (!data?.supported || busy) && "opacity-30"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-sm transition-transform duration-200",
                    autoSleepEnabled ? "translate-x-5 bg-background" : "translate-x-1 bg-muted/40"
                  )}
                />
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-foreground">Idle State Brightness</p>
                <span className="text-[12px] font-mono text-muted bg-background px-2 py-0.5 border border-border rounded-sm">{dimmedBrightnessPercent}%</span>
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
                className="w-full h-1.5 rounded-full appearance-none bg-border/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm"
              />
            </div>

            <div className="space-y-4">
              <p className="text-[13px] font-bold uppercase tracking-wider text-foreground">Dimming Latency</p>
              <div className="flex flex-wrap gap-2">
                {TIMEOUT_OPTIONS.map((option) => (
                  <button
                    key={`dim-${option}`}
                    onClick={() =>
                      void postAction({ action: "set_dim_after", dimAfterSeconds: option })
                    }
                    disabled={busy || !data?.supported || !autoSleepEnabled}
                    className={cn(
                      "rounded-md border px-3 py-2 text-[11px] font-bold tracking-widest transition-all",
                      dimAfterSeconds === option
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted border-border hover:border-muted",
                      (!data?.supported || busy || !autoSleepEnabled) && "opacity-30"
                    )}
                  >
                    {option}S
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[13px] font-bold uppercase tracking-wider text-foreground">Terminal Power State</p>
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
                      "rounded-md border px-3 py-2 text-[11px] font-bold tracking-widest transition-all",
                      turnOffAfterSeconds === option
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted border-border hover:border-muted",
                      (!data?.supported || busy || !autoSleepEnabled) && "opacity-30"
                    )}
                  >
                    {option}S
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted italic">
                Backlight is fully terminated after secondary latency period.
              </p>
            </div>
          </div>
        </section>

        <section className="perf-section">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
            Circadian Logic
          </h2>
          <div className="space-y-8 rounded-lg border border-border bg-muted/5 p-5">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-[15px] font-medium text-foreground">Diurnal Awakening</p>
                <p className="text-[12px] text-muted">Prevent sleep cycles during active daylight.</p>
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
                  "w-10 h-6 rounded-md relative shrink-0 transition-colors duration-200",
                  keepAwakeDuringDay ? "bg-foreground" : "bg-muted/10 border border-border",
                  (!data?.supported || busy) && "opacity-30"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-sm transition-transform duration-200",
                    keepAwakeDuringDay ? "translate-x-5 bg-background" : "translate-x-1 bg-muted/40"
                  )}
                />
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <p className="text-[13px] font-bold uppercase tracking-wider text-foreground">Daylight Commencement</p>
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
                      "rounded-md border px-3 py-2 text-[11px] font-bold tracking-widest transition-all",
                      dayStartsAt === option
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted border-border hover:border-muted",
                      (!data?.supported || busy || !keepAwakeDuringDay) && "opacity-30"
                    )}
                  >
                    {formatClock(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[13px] font-bold uppercase tracking-wider text-foreground">Nocturnal Threshold</p>
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
                      "rounded-md border px-3 py-2 text-[11px] font-bold tracking-widest transition-all",
                      nightStartsAt === option
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted border-border hover:border-muted",
                      (!data?.supported || busy || !keepAwakeDuringDay) && "opacity-30"
                    )}
                  >
                    {formatClock(option)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted italic">
                Active daylight window currently configured: {formatClock(dayStartsAt)} — {formatClock(nightStartsAt)}.
              </p>
            </div>
          </div>
        </section>
        <div className="h-12" />
      </div>
    </div>
  );
}
