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
  className?: string;
}

export function AssistantHandle({
  state = "drawer",
  className,
}: AssistantHandleProps) {
  return (
    <div
      data-assistant-handle=""
      data-state={state}
      className={cn(
        "flex h-8 w-[82px] items-center justify-center rounded-md border border-border bg-surface",
        className
      )}
    >
      <AssistantPulse state={state} />
    </div>
  );
}

function AssistantPulse({ state }: { state: AssistantHandleState }) {
  if (state === "drawer" || state === "idle") {
    return (
      <div aria-hidden="true" className="h-1.5 w-10 rounded-sm bg-muted/30" />
    );
  }

  if (state === "thinking") {
    return (
      <div aria-hidden="true" className="flex h-3 items-end gap-1">
        {[0, 1, 2].map((index) => (
          <span key={index} className="h-1.5 w-1 rounded-sm bg-muted/60" />
        ))}
      </div>
    );
  }

  const toneClass = state === "listening" ? "bg-[var(--minimalist-pastel-blue-fg)]" : "bg-foreground";

  return (
    <div aria-hidden="true" className="flex h-3 items-end gap-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn("w-1 rounded-sm animate-pulse", toneClass)}
          style={{
            height: [8, 12, 9][index],
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}
