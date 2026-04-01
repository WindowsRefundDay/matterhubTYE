"use client";

import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { getDeviceIconName, getDeviceStatus } from "./device-presentation";

interface DeviceTileProps {
  device: Device;
  onToggle: (deviceId: string) => void;
  onSelect?: (deviceId: string) => void;
}

export const DeviceTile = memo(function DeviceTile({
  device,
  onToggle,
  onSelect,
}: DeviceTileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3.5 transition-colors",
        device.isOn
          ? "bg-accent/10 border-accent/20"
          : "bg-surface border-border/20"
      )}
    >
      <button
        onPointerDown={() => onToggle(device.id)}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-[transform,color,background-color]",
          "active:scale-95",
          device.isOn ? "bg-accent/20 text-accent" : "bg-surface-raised text-foreground/40"
        )}
      >
        <Icon name={getDeviceIconName(device.type)} size={20} />
      </button>
      <button
        onPointerDown={() => onSelect?.(device.id)}
        className="flex-1 text-left min-w-0 transition-transform active:scale-[0.99]"
      >
        <p className="text-[13px] font-medium text-foreground truncate">{device.name}</p>
        <p className={cn(
          "text-[11px] mt-0.5",
          device.isOn ? "text-accent/70" : "text-foreground/35"
        )}>
          {getDeviceStatus(device)}
        </p>
      </button>
      <button
        onPointerDown={() => onToggle(device.id)}
        className={cn(
          "w-10 h-5 rounded-full relative shrink-0 transition-colors",
          device.isOn ? "bg-accent" : "bg-surface-raised"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
            device.isOn ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
});
