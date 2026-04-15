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
    <div data-theme="minimalist" className="space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center border transition-all",
            device.isOn 
              ? "bg-[var(--minimalist-pastel-yellow)] text-[var(--minimalist-pastel-yellow-fg)] border-[var(--minimalist-pastel-yellow-fg)]/20" 
              : "bg-muted/5 text-muted border-border"
          )}>
            <Icon name={device.type === "lamp" ? "lamp" : "light-bulb"} size={28} />
          </div>
          <div>
            <h3 className="text-[16px] font-medium tracking-tight text-foreground">{device.name}</h3>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted mt-1">
              {device.isOn ? `${device.value || 100}% Intensity` : "Currently Off"}
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
          {device.isOn ? "Turn Off" : "Turn On"}
        </button>
      </div>

      {device.isOn && (
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Brightness</span>
            <span className="text-[14px] font-mono text-foreground">{device.value || 100}%</span>
          </div>
          <div className="relative flex items-center h-8">
            <input
              type="range"
              min={1}
              max={100}
              value={device.value || 100}
              onChange={(e) => setDeviceValue(device.id, Number(e.target.value))}
              className="w-full h-[2px] rounded-full appearance-none bg-border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:shadow-sm transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
