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
          "h-1.5 w-14 rounded-full bg-foreground/25 transition-colors duration-200",
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
        "flex min-w-[220px] max-w-[320px] items-center gap-3 rounded-full border border-border/40 bg-surface px-4 py-2",
        "shadow-[0_8px_16px_rgba(0,0,0,0.14)]",
        className
      )}
    >
      <AssistantPulse state={state} />

      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/45">
          {hint ?? `${copy.label} ${channelLabel}`}
        </p>
        <p className="truncate text-[13px] font-medium text-foreground/90">
          {transcript?.trim() || copy.fallback}
        </p>
      </div>
    </div>
  );
}

function AssistantPulse({ state }: { state: AssistantHandleState }) {
  if (state === "drawer") {
    return <div className="h-2 w-10 rounded-full bg-foreground/20" />;
  }

  if (state === "idle" || state === "thinking") {
    return (
      <div aria-hidden="true" className="flex h-8 items-end gap-1">
        {[12, 20, 15].map((height, index) => (
          <span
            key={`${state}-${height}-${index}`}
            className="w-1 rounded-full bg-foreground/45"
            style={{ height }}
          />
        ))}
      </div>
    );
  }

  const toneClass =
    state === "listening"
      ? "bg-accent"
      : state === "speaking"
        ? "bg-foreground"
        : "bg-foreground/60";

  return (
    <div
      aria-hidden="true"
      className="flex h-8 items-end gap-1"
    >
      {[12, 20, 15].map((height, index) => (
        <span
          key={`${state}-${height}-${index}`}
          className={cn("w-1 rounded-full animate-pulse", toneClass)}
          style={{ height, animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}
