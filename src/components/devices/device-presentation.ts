import type { Device, DeviceType } from "@/types";

export type DeviceControlKind =
  | "light"
  | "climate"
  | "media"
  | "lock"
  | "sensor";

const devicePresentation: Record<
  DeviceType,
  {
    control: DeviceControlKind;
    icon: string;
    status: (device: Device) => string;
  }
> = {
  light: {
    control: "light",
    icon: "light-bulb",
    status: (device) => (device.value ? `${device.value}%` : "On"),
  },
  lamp: {
    control: "light",
    icon: "lamp",
    status: (device) => (device.value ? `${device.value}%` : "On"),
  },
  thermostat: {
    control: "climate",
    icon: "thermometer",
    status: (device) => `${device.targetTemperature}°F`,
  },
  plug: {
    control: "light",
    icon: "plug",
    status: () => "On",
  },
  lock: {
    control: "lock",
    icon: "lock",
    status: (device) => (device.isLocked ? "Locked" : "Unlocked"),
  },
  sensor: {
    control: "sensor",
    icon: "sensor",
    status: (device) => device.lastTriggered || "Active",
  },
  camera: {
    control: "sensor",
    icon: "camera",
    status: () => "Recording",
  },
  fan: {
    control: "climate",
    icon: "fan",
    status: (device) => (device.value ? `${device.value}%` : "On"),
  },
  tv: {
    control: "media",
    icon: "tv",
    status: (device) => device.mediaTitle || "On",
  },
  purifier: {
    control: "climate",
    icon: "wind",
    status: (device) => (device.value ? `${device.value}%` : "On"),
  },
  washer: {
    control: "light",
    icon: "washer",
    status: (device) => device.mediaTitle || "On",
  },
  dryer: {
    control: "light",
    icon: "dryer",
    status: (device) => device.mediaTitle || "On",
  },
  dishwasher: {
    control: "light",
    icon: "dishwasher",
    status: (device) => device.mediaTitle || "On",
  },
  fridge: {
    control: "sensor",
    icon: "fridge",
    status: (device) =>
      device.temperature != null ? `${device.temperature}°F` : "Cooling",
  },
  garage_door: {
    control: "lock",
    icon: "garage-door",
    status: (device) => (device.isLocked ? "Closed" : "Open"),
  },
  speaker: {
    control: "media",
    icon: "speaker",
    status: (device) => device.mediaTitle || "On",
  },
  doorbell: {
    control: "sensor",
    icon: "bell",
    status: (device) => device.lastTriggered || "Ready",
  },
};

export function getDeviceControlKind(deviceType: DeviceType): DeviceControlKind {
  return devicePresentation[deviceType].control;
}

export function getDeviceIconName(deviceType: DeviceType): string {
  return devicePresentation[deviceType].icon;
}

export function getDeviceStatus(device: Device): string {
  if (!device.isOn) {
    return "Off";
  }

  return devicePresentation[device.type].status(device);
}
