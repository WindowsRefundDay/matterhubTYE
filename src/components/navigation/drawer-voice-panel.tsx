"use client";

import { useLayoutEffect, useRef } from "react";
import type { ConversationTurn, VoiceState } from "@/hooks/use-voice-assistant";
import { cn } from "@/lib/utils";

interface DrawerVoicePanelProps {
  turns: ConversationTurn[];
  voiceState: VoiceState;
  currentImage: { url: string; caption?: string } | null;
  micError: string | null;
}

export function DrawerVoicePanel({
  turns,
  voiceState,
  currentImage,
  micError,
}: DrawerVoicePanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const id = window.requestAnimationFrame(() => {
      // Only scroll the transcript pane, never the outer drawer/screen.
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [turns.length, currentImage, voiceState]);

  const statusLabel =
    voiceState === "listening"
      ? "Listening"
      : voiceState === "thinking"
        ? "Thinking"
        : voiceState === "speaking"
          ? "Speaking"
          : "Ready";

  const emptyCopy =
    voiceState === "thinking"
      ? "Thinking..."
      : voiceState === "speaking"
        ? "Responding..."
        : voiceState === "listening"
          ? "Listening..."
          : "Start speaking.";

  return (
    <div className="relative z-10 mx-4 mt-2 flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Voice Session
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {statusLabel}
        </p>
      </div>

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pt-4 pb-8"
      >
        {turns.length === 0 && (
          <p className="font-serif text-[22px] leading-[1.25] tracking-[-0.02em] text-foreground">
            {emptyCopy}
          </p>
        )}

        {micError && (
          <div className="rounded-md border border-[var(--minimalist-pastel-red-fg)]/20 bg-[var(--minimalist-pastel-red)] px-4 py-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--minimalist-pastel-red-fg)]">
              Temp Mic Diagnostics
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--minimalist-pastel-red-fg)]">
              {micError}
            </p>
          </div>
        )}

        {turns.map((turn, index) => {
          const isNewest = index === turns.length - 1;
          return (
          <div key={turn.timestamp} className="space-y-1">
            <p
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.14em]",
                turn.role === "user" ? "text-muted" : "text-[var(--minimalist-pastel-blue-fg)]",
                !isNewest && "opacity-70"
              )}
            >
              {turn.role === "user" ? "You" : "Assistant"}
            </p>
            <p
              className={cn(
                "leading-snug",
                isNewest
                  ? turn.role === "assistant"
                    ? "font-serif text-[30px] tracking-[-0.025em] text-foreground"
                    : "font-sans text-[22px] font-medium text-foreground"
                  : "font-mono text-[12px] tracking-[0.01em] text-muted"
              )}
            >
              {turn.text}
            </p>
          </div>
        )})}

        {currentImage && (
          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage.url}
              alt={currentImage.caption ?? "Assistant image"}
              className="max-h-52 w-full rounded-md object-contain"
            />
            {currentImage.caption && (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {currentImage.caption}
              </p>
            )}
          </div>
        )}
        <div className="h-3" />
      </div>
    </div>
  );
}
