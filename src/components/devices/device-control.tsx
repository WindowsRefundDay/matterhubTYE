import type { Device } from "@/types";
import { LightControl } from "./light-control";
import { ClimateControl } from "./climate-control";
import { MediaControl } from "./media-control";
import { LockControl } from "./lock-control";
import { SensorDisplay } from "./sensor-display";
import { getDeviceControlKind } from "./device-presentation";

export function DeviceControl({ device }: { device: Device }) {
  switch (getDeviceControlKind(device.type)) {
    case "light":
      return <LightControl device={device} />;
    case "climate":
      return <ClimateControl device={device} />;
    case "media":
      return <MediaControl device={device} />;
    case "lock":
      return <LockControl device={device} />;
    case "sensor":
      return <SensorDisplay device={device} />;
    default:
      return null;
  }
}
