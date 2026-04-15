"use client";

import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { getDeviceIconName, getDeviceStatus } from "./device-presentation";
import { useTap } from "@/hooks/use-tap";

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
  const toggleTap = useTap(() => onToggle(device.id));
  const selectTap = useTap(() => onSelect?.(device.id));

  return (
    <div className="flex w-full items-center gap-5 py-5 text-left border-b border-border last:border-0">
      <button
        {...selectTap}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-lg border shrink-0 transition-transform active:scale-95",
          device.isOn ? "bg-foreground text-background border-foreground" : "bg-muted/5 text-muted border-border"
        )}
      >
        <Icon name={getDeviceIconName(device.type)} size={20} />
      </button>

      <button
        {...selectTap}
        className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
      >
        <p className="text-[15px] font-medium text-foreground truncate">{device.name}</p>
        <p className={cn(
          "text-[12px]",
          device.isOn ? "text-[var(--minimalist-pastel-yellow-fg)]" : "text-muted"
        )}>
          {getDeviceStatus(device)}
        </p>
      </button>

      <button
        {...toggleTap}
        className={cn(
          "w-10 h-6 rounded-md relative shrink-0 transition-colors duration-200 ease-in-out",
          device.isOn ? "bg-foreground" : "bg-muted/10 border border-border"
        )}
      >
        <div
          className={cn(
            "absolute top-1 w-4 h-4 rounded-sm transition-transform duration-200 ease-in-out",
            device.isOn ? "translate-x-5 bg-background" : "translate-x-1 bg-muted/40"
          )}
        />
      </button>
    </div>
  );
});
