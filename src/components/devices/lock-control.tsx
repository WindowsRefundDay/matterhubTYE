"use client";

import { useSmartHomeActions } from "@/hooks/use-smart-home";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";

export function LockControl({ device }: { device: Device }) {
  const { toggleLock } = useSmartHomeActions();

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className={cn(
        "w-20 h-20 rounded-2xl flex items-center justify-center transition-colors",
        device.isLocked ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
      )}>
        <Icon name={device.isLocked ? "lock" : "lock-open"} size={36} />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-medium">{device.name}</p>
        <p className={cn(
          "text-[13px] mt-1",
          device.isLocked ? "text-green-400/70" : "text-red-400/70"
        )}>
          {device.isLocked ? "Locked" : "Unlocked"}
        </p>
      </div>
      <button
        onPointerDown={() => toggleLock(device.id)}
        className={cn(
          "px-8 py-3 rounded-2xl text-[14px] font-medium transition-[transform,background-color] active:scale-95",
          device.isLocked
            ? "bg-red-500/15 text-red-400 active:bg-red-500/25"
            : "bg-green-500/15 text-green-400 active:bg-green-500/25"
        )}
      >
        {device.isLocked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}
