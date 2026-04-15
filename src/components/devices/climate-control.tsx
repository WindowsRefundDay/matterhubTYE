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
      <div data-theme="minimalist" className="space-y-12 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[var(--minimalist-pastel-blue)] text-[var(--minimalist-pastel-blue-fg)] border border-[var(--minimalist-pastel-blue-fg)]/20 flex items-center justify-center">
              <Icon name="thermometer" size={28} />
            </div>
            <div>
              <h3 className="text-[16px] font-medium tracking-tight text-foreground">{device.name}</h3>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted mt-1">
                Ambient {device.temperature}°F
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 py-4">
          <div className="flex items-center justify-center gap-12">
            <button
              {...tempDownTap}
              className="w-16 h-16 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted/5 active:scale-90 transition-all"
            >
              <Icon name="minus" size={24} />
            </button>
            <div className="text-center min-w-[120px]">
              <p className="font-serif text-[72px] leading-none text-foreground tabular-nums tracking-tighter">
                {device.targetTemperature}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted mt-2 ml-2">Target °F</p>
            </div>
            <button
              {...tempUpTap}
              className="w-16 h-16 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted/5 active:scale-90 transition-all"
            >
              <Icon name="plus" size={24} />
            </button>
          </div>
        </div>

        <div className="flex justify-center pt-4">
           <div className="px-4 py-2 rounded-full bg-muted/5 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">System {device.isOn ? "Heating" : "Standby"}</p>
           </div>
        </div>
      </div>
    );
  }

  // Fan / Purifier
  return (
    <div data-theme="minimalist" className="space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center border transition-all",
            device.isOn 
              ? "bg-[var(--minimalist-pastel-green)] text-[var(--minimalist-pastel-green-fg)] border-[var(--minimalist-pastel-green-fg)]/20" 
              : "bg-muted/5 text-muted border-border"
          )}>
            <Icon name={device.type === "fan" ? "fan" : "wind"} size={28} />
          </div>
          <div>
            <h3 className="text-[16px] font-medium tracking-tight text-foreground">{device.name}</h3>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted mt-1">
              {device.isOn ? `Active at ${device.value}%` : "Suspended"}
            </p>
          </div>
        </div>
        <button
          {...toggleTap}
          className={cn(
            "px-6 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95",
            device.isOn 
              ? "bg-foreground text-background" 
              : "bg-background text-foreground border border-border"
          )}
        >
          {device.isOn ? "Switch Off" : "Switch On"}
        </button>
      </div>
      {device.isOn && (
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Flow Intensity</span>
            <span className="text-[14px] font-mono text-foreground">{device.value}%</span>
          </div>
          <div className="relative flex items-center h-8">
            <input
              type="range"
              min={1}
              max={100}
              value={device.value || 50}
              onChange={(e) => setDeviceValue(device.id, Number(e.target.value))}
              className="w-full h-[2px] rounded-full appearance-none bg-border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:shadow-sm transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
