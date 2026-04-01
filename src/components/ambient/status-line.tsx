"use client";

import { useMemo } from "react";
import { useSmartHomeDevices } from "@/hooks/use-smart-home";

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

  let status: string;
  if (activeDeviceCount === 0) {
    status = "All devices off";
  } else if (lightsOn === 0) {
    status = `${activeDeviceCount} device${activeDeviceCount > 1 ? "s" : ""} active · All lights off`;
  } else {
    status = `${activeDeviceCount} device${activeDeviceCount > 1 ? "s" : ""} active · ${lightsOn} light${lightsOn > 1 ? "s" : ""} on`;
  }

  if (lock) {
    status += " · Door locked";
  }

  return (
    <p className="text-[13px] font-light text-foreground/25 tracking-wide">
      {status}
    </p>
  );
}
