"use client";

import { useMemo } from "react";
import { useSmartHomeActions, useSmartHomeDevices } from "@/hooks/use-smart-home";
import { DeviceTile } from "./device-tile";
import type { DeviceCategory } from "@/types";

const categoryLabels: Record<DeviceCategory, string> = {
  lights: "Lights",
  climate: "Climate",
  media: "Media",
  security: "Security",
  sensors: "Sensors",
  plugs: "Plugs",
};

const categoryOrder: DeviceCategory[] = ["lights", "climate", "media", "security", "sensors", "plugs"];

interface DeviceListProps {
  onSelectDevice: (deviceId: string) => void;
}

export function DeviceList({ onSelectDevice }: DeviceListProps) {
  const { devices } = useSmartHomeDevices();
  const { toggleDevice } = useSmartHomeActions();

  const grouped = useMemo(() => {
    const groups: Partial<Record<DeviceCategory, typeof devices>> = {};
    for (const device of devices) {
      if (!groups[device.category]) groups[device.category] = [];
      groups[device.category]!.push(device);
    }
    return groups;
  }, [devices]);

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-[20px] font-medium text-foreground mb-4">Devices</h1>
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-5 perf-scroll-region">
        {categoryOrder.map((category) => {
          const items = grouped[category];
          if (!items || items.length === 0) return null;
          return (
            <section key={category} className="perf-section">
              <h2 className="text-[13px] font-medium text-foreground/40 uppercase tracking-wider mb-2">
                {categoryLabels[category]}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {items.map((device) => (
                  <DeviceTile
                    key={device.id}
                    device={device}
                    onToggle={toggleDevice}
                    onSelect={onSelectDevice}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
