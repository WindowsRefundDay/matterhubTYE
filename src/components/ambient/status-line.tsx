"use client";

import { useSmartHome } from "@/hooks/use-smart-home";

export function StatusLine() {
  const { devices, activeDeviceCount } = useSmartHome();

  const lock = devices.find((d) => d.type === "lock");
  const lightsOn = devices.filter((d) => d.category === "lights" && d.isOn).length;

  let status: string;
  if (activeDeviceCount === 0) {
    status = "All devices off";
  } else if (lightsOn === 0) {
    status = `${activeDeviceCount} device${activeDeviceCount > 1 ? "s" : ""} active · All lights off`;
  } else {
    status = `${activeDeviceCount} device${activeDeviceCount > 1 ? "s" : ""} active · ${lightsOn} light${lightsOn > 1 ? "s" : ""} on`;
  }

  if (lock?.isLocked) {
    status += " · Door locked";
  }

  return (
    <p className="text-[13px] font-light text-foreground/25 tracking-wide">
      {status}
    </p>
  );
}
