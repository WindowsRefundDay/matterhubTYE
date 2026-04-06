"use client";

import { useSmartHomeActions } from "@/hooks/use-smart-home";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { useTap } from "@/hooks/use-tap";

export function LightControl({ device }: { device: Device }) {
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
            <Icon name={device.type === "lamp" ? "lamp" : "light-bulb"} size={24} />
          </div>
          <div>
            <p className="text-[15px] font-medium">{device.name}</p>
            <p className="text-[12px] text-foreground/40">{device.isOn ? `${device.value || 100}%` : "Off"}</p>
          </div>
        </div>
        <button
          {...toggleTap}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-medium transition-colors",
            device.isOn ? "bg-accent text-black" : "bg-surface-raised text-foreground/60"
          )}
        >
          {device.isOn ? "On" : "Off"}
        </button>
      </div>

      {device.isOn && (
        <div className="space-y-2">
          <div className="flex justify-between text-[12px] text-foreground/40">
            <span>Brightness</span>
            <span>{device.value || 100}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={device.value || 100}
            onChange={(e) => setDeviceValue(device.id, Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-surface-raised [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
      )}
    </div>
  );
}
