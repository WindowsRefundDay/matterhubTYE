"use client";

import { useSmartHomeActions } from "@/hooks/use-smart-home";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { useTap } from "@/hooks/use-tap";

export function MediaControl({ device }: { device: Device }) {
  const { toggleDevice, setDeviceValue } = useSmartHomeActions();
  const toggleTap = useTap(() => toggleDevice(device.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            device.isOn ? "bg-accent/20 text-accent" : "bg-surface-raised text-foreground/40"
          )}>
            <Icon name="tv" size={24} />
          </div>
          <div>
            <p className="text-[15px] font-medium">{device.name}</p>
            <p className="text-[12px] text-foreground/40">
              {device.isOn ? device.mediaTitle || "On" : "Off"}
            </p>
          </div>
        </div>
        <button
          {...toggleTap}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            device.isOn ? "bg-accent text-black" : "bg-surface-raised text-foreground/60"
          )}
        >
          <Icon name="power" size={18} />
        </button>
      </div>
      {device.isOn && (
        <div className="space-y-2">
          <div className="flex justify-between text-[12px] text-foreground/40">
            <span>Volume</span>
            <span>{device.value || 30}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={device.value || 30}
            onChange={(e) => setDeviceValue(device.id, Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-surface-raised [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
      )}
    </div>
  );
}
