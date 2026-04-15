"use client";

import { useSmartHomeActions } from "@/hooks/use-smart-home";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { useTap } from "@/hooks/use-tap";

export function LockControl({ device }: { device: Device }) {
  const { toggleLock } = useSmartHomeActions();
  const lockTap = useTap(() => toggleLock(device.id));

  return (
    <div data-theme="minimalist" className="flex flex-col items-center gap-8 py-8">
      <div className={cn(
        "w-24 h-24 rounded-2xl flex items-center justify-center border transition-all",
        device.isLocked 
          ? "bg-[var(--minimalist-pastel-green)] text-[var(--minimalist-pastel-green-fg)] border-[var(--minimalist-pastel-green-fg)]/20" 
          : "bg-[var(--minimalist-pastel-red)] text-[var(--minimalist-pastel-red-fg)] border-[var(--minimalist-pastel-red-fg)]/20"
      )}>
        <Icon name={device.isLocked ? "lock" : "lock-open"} size={40} />
      </div>
      
      <div className="text-center">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground">{device.name}</h3>
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-muted mt-2">
          {device.isLocked ? "Secure" : "Unlocked"}
        </p>
      </div>

      <button
        {...lockTap}
        className={cn(
          "w-full max-w-[240px] py-4 rounded-lg text-[13px] font-bold uppercase tracking-widest transition-all active:scale-[0.98]",
          device.isLocked
            ? "bg-foreground text-background"
            : "bg-background text-foreground border border-foreground"
        )}
      >
        {device.isLocked ? "Unlock Door" : "Lock Door"}
      </button>
    </div>
  );
}
