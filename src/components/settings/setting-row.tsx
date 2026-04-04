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
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-[12px] text-foreground/35 mt-0.5">{description}</p>
        )}
      </div>
      {toggle ? (
        <button
          {...tap}
          className={cn(
            "w-10 h-5 rounded-full relative shrink-0 transition-colors",
            isOn ? "bg-accent" : "bg-surface-raised"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
              isOn ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      ) : value ? (
        <span className="text-[13px] text-foreground/40">{value}</span>
      ) : null}
    </div>
  );
}
