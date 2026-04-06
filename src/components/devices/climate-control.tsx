"use client";

import { useSmartHomeActions } from "@/hooks/use-smart-home";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { useTap } from "@/hooks/use-tap";

export function ClimateControl({ device }: { device: Device }) {
  const { toggleDevice, setDeviceValue, setDeviceTemperature } = useSmartHomeActions();
  const tempDownTap = useTap(() => setDeviceTemperature(device.id, (device.targetTemperature || 72) - 1));
  const tempUpTap = useTap(() => setDeviceTemperature(device.id, (device.targetTemperature || 72) + 1));
  const toggleTap = useTap(() => toggleDevice(device.id));

  if (device.type === "thermostat") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
              <Icon name="thermometer" size={24} />
            </div>
            <div>
              <p className="text-[15px] font-medium">{device.name}</p>
              <p className="text-[12px] text-foreground/40">
                Current: {device.temperature}°F
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6">
          <button
            {...tempDownTap}
            className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-foreground/60 active:scale-90 transition-transform"
          >
            <Icon name="minus" size={20} />
          </button>
          <div className="text-center">
            <p className="text-[40px] font-light tabular-nums text-foreground">
              {device.targetTemperature}°
            </p>
            <p className="text-[12px] text-foreground/40">Target</p>
          </div>
          <button
            {...tempUpTap}
            className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-foreground/60 active:scale-90 transition-transform"
          >
            <Icon name="plus" size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Fan / Purifier
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            device.isOn ? "bg-accent/20 text-accent" : "bg-surface-raised text-foreground/40"
          )}>
            <Icon name={device.type === "fan" ? "fan" : "wind"} size={24} />
          </div>
          <div>
            <p className="text-[15px] font-medium">{device.name}</p>
            <p className="text-[12px] text-foreground/40">{device.isOn ? `Speed: ${device.value}%` : "Off"}</p>
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
            <span>Speed</span>
            <span>{device.value}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={device.value || 50}
            onChange={(e) => setDeviceValue(device.id, Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-surface-raised [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
      )}
    </div>
  );
}
