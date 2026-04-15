"use client";

import { Icon } from "@/components/ui/icon";
import { useLocalAudioPlayer } from "@/hooks/use-local-audio-player";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";
import type { AudioOutputSupport, AudioTrack } from "@/types/audio";

interface AudioPlayerPanelProps {
  track: AudioTrack;
  outputId: string;
  outputLabel: string;
  support: AudioOutputSupport;
  onLogEvent: (event: string, details?: Record<string, unknown>) => void;
  onBack: () => void;
}

export function AudioPlayerPanel({
  track,
  outputId,
  outputLabel,
  support,
  onLogEvent,
  onBack,
}: AudioPlayerPanelProps) {
  const backTap = useTap(onBack);
  const {
    currentTime,
    duration,
    elapsedLabel,
    remainingLabel,
    isPlaying,
    error,
    togglePlayPause,
    seekTo,
    skipBy,
  } = useLocalAudioPlayer(track, {
    autoPlay: true,
    outputDeviceId: outputId,
    outputLabel,
    support,
    logEvent: onLogEvent,
  });

  return (
    <div className="relative h-full overflow-hidden rounded-[24px] border border-border/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(120,53,15,0.42),transparent_40%),linear-gradient(180deg,#18181b_0%,#09090b_100%)] px-3 py-3 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_28%,transparent_72%,rgba(255,176,0,0.06))]" />

      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3">
          <button
            {...backTap}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface/80 text-foreground/70 transition-transform active:scale-95"
          >
            <Icon name="chevron-left" size={16} />
          </button>

          <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            Audio pipeline test
          </div>

          <div className="rounded-full border border-border/20 bg-surface/70 px-3 py-1 text-right">
            <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/35">Output</p>
            <p className="text-[11px] font-medium text-foreground/80">{outputLabel}</p>
          </div>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-[170px_minmax(0,1fr)] gap-3">
          <div className="flex items-center justify-center">
            <div className="relative h-[170px] w-[170px] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.46),rgba(180,83,9,0.18)_36%,rgba(9,9,11,0.95)_74%),linear-gradient(165deg,#2b1704_0%,#111827_100%)] shadow-[0_14px_36px_rgba(245,158,11,0.16)]">
              <div className="absolute inset-0 rounded-[24px] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),transparent_28%,transparent_72%,rgba(255,176,0,0.08))]" />
              <div className="absolute inset-4 rounded-[18px] border border-white/8" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/25 text-amber-100 transition-transform duration-300",
                  isPlaying && "scale-105"
                )}>
                  <Icon name="music" size={28} />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 rounded-[16px] border border-white/10 bg-black/25 px-2.5 py-2 backdrop-blur-sm">
                <p className="text-[8px] uppercase tracking-[0.16em] text-amber-100/70">
                  {track.accentLabel ?? "Reference track"}
                </p>
                <p className="mt-1 text-[10px] font-medium leading-4 text-white/90">
                  Testing the selected output path
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 min-h-0 flex-col overflow-hidden">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/35">
                Settings → Audio → Test audio
              </p>
              <h1 className="mt-2 max-w-[7ch] text-[24px] font-semibold leading-[0.98] text-white">
                {track.title}
              </h1>
              <p className="mt-1.5 text-[13px] text-amber-200/80">
                {track.artist}
              </p>
              <p className="mt-2 max-w-xl text-[11px] leading-4 text-foreground/55">
                Local output test today. Reusable shell for streaming controls later.
              </p>
            </div>

            <div className="mt-3 rounded-[20px] border border-white/8 bg-white/5 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.16em] text-foreground/35">
                <span>Testing output</span>
                <span>{outputLabel}</span>
              </div>

              <div className="mt-2.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-400"
                />
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-foreground/45">
                  <span>{elapsedLabel}</span>
                  <span>{remainingLabel}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => skipBy(-10)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-foreground/65 transition-colors active:bg-white/12"
                  aria-label="Skip back 10 seconds"
                >
                  <Icon name="skip-back" size={18} />
                </button>

                <button
                  onClick={() => void togglePlayPause()}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/20 bg-amber-400 text-black shadow-[0_8px_20px_rgba(245,158,11,0.32)] transition-transform active:scale-95"
                  aria-label={isPlaying ? "Pause audio test" : "Play audio test"}
                >
                  <Icon name={isPlaying ? "pause" : "play"} size={20} />
                </button>

                <button
                  onClick={() => skipBy(10)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-foreground/65 transition-colors active:bg-white/12"
                  aria-label="Skip forward 10 seconds"
                >
                  <Icon name="skip-forward" size={18} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-black/15 px-3 py-2">
                <p className="min-w-0 text-[10px] text-foreground/45">
                  Browser sink routing + fallback logging
                </p>
                <div className="shrink-0 rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                  {outputLabel}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-foreground/28">
                <span>Queue coming later</span>
                <span>{error ?? (support.setSinkId ? "Testing local playback pipeline..." : "Browser output switching unavailable")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
