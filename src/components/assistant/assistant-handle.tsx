"use client";

import { cn } from "@/lib/utils";

export type AssistantHandleState =
  | "drawer"
  | "idle"
  | "listening"
  | "thinking"
  | "speaking";

export type AssistantHandleChannel = "input" | "output";

interface AssistantHandleProps {
  state?: AssistantHandleState;
  channel?: AssistantHandleChannel;
  transcript?: string;
  hint?: string;
  className?: string;
}

const STATE_COPY: Record<
  AssistantHandleState,
  { label: string; fallback: string }
> = {
  drawer: { label: "Drawer", fallback: "" },
  idle: { label: "Assistant", fallback: "Ready when you are" },
  listening: { label: "Listening", fallback: "Waiting for voice input" },
  thinking: { label: "Thinking", fallback: "Working on your request" },
  speaking: { label: "Speaking", fallback: "Returning a voice response" },
};

export function AssistantHandle({
  state = "drawer",
  channel,
  transcript,
  hint,
  className,
}: AssistantHandleProps) {
  const copy = STATE_COPY[state];
  const channelLabel =
    channel ?? (state === "speaking" ? "output" : "input");
  const hasExpandedContent = state !== "drawer" || Boolean(hint) || Boolean(transcript?.trim());

  if (!hasExpandedContent) {
    return (
      <div
        aria-hidden="true"
        data-assistant-handle=""
        data-state={state}
        className={cn(
          "h-1 w-12 bg-muted/30 transition-colors duration-200 rounded-sm",
          className
        )}
      />
    );
  }

  return (
    <div
      data-assistant-handle=""
      data-state={state}
      data-channel={channelLabel}
      className={cn(
        "flex min-w-[240px] max-w-[340px] items-center gap-4 rounded-lg border border-border bg-background px-4 py-3",
        "shadow-sm",
        className
      )}
    >
      <AssistantPulse state={state} />

      <div className="min-w-0 flex-1 text-left border-l border-border pl-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
          {hint ?? `${copy.label} ${channelLabel}`}
        </p>
        <p className="truncate font-serif text-[18px] leading-tight text-foreground">
          {transcript?.trim() || copy.fallback}
        </p>
      </div>
    </div>
  );
}

function AssistantPulse({ state }: { state: AssistantHandleState }) {
  if (state === "drawer") {
    return <div className="h-1.5 w-8 bg-muted/20 rounded-sm" />;
  }

  const barCount = 3;
  const bars = Array.from({ length: barCount });

  if (state === "idle" || state === "thinking") {
    return (
      <div aria-hidden="true" className="flex h-8 items-center gap-1.5">
        {bars.map((_, index) => (
          <span
            key={`${state}-${index}`}
            className="w-1 bg-muted/40 rounded-sm"
            style={{ height: [12, 20, 16][index] }}
          />
        ))}
      </div>
    );
  }

  const toneClass =
    state === "listening"
      ? "bg-[var(--minimalist-pastel-blue-fg)]"
      : state === "speaking"
        ? "bg-foreground"
        : "bg-muted";

  return (
    <div
      aria-hidden="true"
      className="flex h-8 items-center gap-1.5"
    >
      {bars.map((_, index) => (
        <span
          key={`${state}-${index}`}
          className={cn("w-1 rounded-sm animate-pulse", toneClass)}
          style={{ 
            height: [14, 24, 18][index], 
            animationDelay: `${index * 150}ms` 
          }}
        />
      ))}
    </div>
  );
}
