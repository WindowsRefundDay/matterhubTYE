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
  appliances: "Appliances",
};

const categoryOrder: DeviceCategory[] = [
  "lights",
  "climate",
  "media",
  "security",
  "sensors",
  "plugs",
  "appliances",
];

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
    <div className="relative h-full bg-background overflow-hidden">
      <div className="corner-fade-header absolute top-0 inset-x-0 z-10 px-6 pt-8 pb-12 pointer-events-none">
        <h1 className="relative font-serif text-[32px] tracking-tight text-foreground pointer-events-auto">Devices</h1>
      </div>

      <div className="perf-scroll-region h-full space-y-12 overflow-y-auto scrollbar-hide px-6 pt-28 pb-32">
        {categoryOrder.map((category) => {
          const items = grouped[category];
          if (!items || items.length === 0) return null;
          return (
            <Section key={category} title={categoryLabels[category]}>
              {items.map((device) => (
                <DeviceTile
                  key={device.id}
                  device={device}
                  onToggle={toggleDevice}
                  onSelect={onSelectDevice}
                />
              ))}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="perf-section">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
        {title}
      </h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
