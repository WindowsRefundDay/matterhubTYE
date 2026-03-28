"use client";

import type { Device } from "@/types";
import { LightControl } from "./light-control";
import { ClimateControl } from "./climate-control";
import { MediaControl } from "./media-control";
import { LockControl } from "./lock-control";
import { SensorDisplay } from "./sensor-display";

export function DeviceControl({ device }: { device: Device }) {
  switch (device.type) {
    case "light":
    case "lamp":
      return <LightControl device={device} />;
    case "thermostat":
    case "fan":
    case "purifier":
      return <ClimateControl device={device} />;
    case "tv":
      return <MediaControl device={device} />;
    case "lock":
      return <LockControl device={device} />;
    case "sensor":
    case "camera":
      return <SensorDisplay device={device} />;
    case "plug":
      return <LightControl device={device} />;
    default:
      return null;
  }
}
