"use client";

import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";

interface SettingRowProps {
  label: string;
  description?: string;
  value?: string;
  toggle?: boolean;
  isOn?: boolean;
  onToggle?: () => void;
}

export function SettingRow({ label, description, value, toggle, isOn, onToggle }: SettingRowProps) {
  const tap = useTap(() => onToggle?.());
  return (
    <div className="flex items-center justify-between py-5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-[14px] font-medium tracking-tight text-foreground">{label}</p>
        {description && (
          <p className="text-[12px] leading-relaxed text-muted mt-1">{description}</p>
        )}
      </div>
      {toggle ? (
        <button
          {...tap}
          className={cn(
            "w-10 h-6 rounded-md relative shrink-0 transition-colors duration-200 ease-in-out",
            isOn ? "bg-foreground" : "bg-muted/10 border border-border"
          )}
        >
          <div
            className={cn(
              "absolute top-1 w-4 h-4 rounded-sm transition-transform duration-200 ease-in-out",
              isOn ? "translate-x-5 bg-background" : "translate-x-1 bg-muted/40"
            )}
          />
        </button>
      ) : value ? (
        <span className="text-[12px] font-mono text-muted uppercase tracking-widest bg-muted/5 px-2 py-1 rounded-sm border border-border/50">{value}</span>
      ) : null}
    </div>
  );
}
