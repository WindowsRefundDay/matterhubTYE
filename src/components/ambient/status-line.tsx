"use client";

import { useMemo } from "react";
import { useSmartHomeDevices } from "@/hooks/use-smart-home";
import { Icon } from "@/components/ui/icon";

export function StatusLine() {
  const { devices, activeDeviceCount } = useSmartHomeDevices();

  const { lock, lightsOn } = useMemo(() => {
    let lockState = false;
    let nextLightsOn = 0;

    for (const device of devices) {
      if (device.type === "lock" && device.isLocked) {
        lockState = true;
      }

      if (device.category === "lights" && device.isOn) {
        nextLightsOn += 1;
      }
    }

    return { lock: lockState, lightsOn: nextLightsOn };
  }, [devices]);

  return (
    <div className="flex items-center gap-6 border-t border-border/40 pt-6 mt-2">
      <div className="flex items-center gap-2">
        <Icon name="grid" size={14} className="text-muted/60" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          {activeDeviceCount} Devices Active
        </span>
      </div>
      
      {lightsOn > 0 && (
        <div className="flex items-center gap-2">
          <Icon name="light-bulb" size={14} className="text-[var(--minimalist-pastel-yellow-fg)]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--minimalist-pastel-yellow-fg)]">
            {lightsOn} Lights On
          </span>
        </div>
      )}

      {lock && (
        <div className="flex items-center gap-2">
          <Icon name="lock" size={14} className="text-[var(--minimalist-pastel-green-fg)]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--minimalist-pastel-green-fg)]">
            Secured
          </span>
        </div>
      )}
    </div>
  );
}
