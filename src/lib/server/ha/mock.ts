import { initialDevices } from "@/data/devices";
import { rooms } from "@/data/rooms";
import { scenes } from "@/data/scenes";
import { mockWeather } from "@/data/weather";
import type { SmartHomeSnapshot } from "./types";

export function buildMockSmartHomeSnapshot(): SmartHomeSnapshot {
  return {
    mode: "mock",
    generatedAt: new Date().toISOString(),
    rooms,
    devices: initialDevices,
    scenes,
    weather: mockWeather,
    diagnostics: [
      {
        level: "warn",
        code: "mock_backend",
        message:
          "Mock backend is active because MATTERHUB_SMART_HOME_BACKEND=mock and MATTERHUB_ALLOW_MOCK_DATA=1 were set explicitly.",
      },
    ],
    entityReferences: Object.fromEntries(
      initialDevices.map((device) => [
        device.id,
        {
          entityId: device.id,
          domain: device.type,
          deviceId: device.id,
          roomId: device.roomId,
          supportedActions: [],
        },
      ])
    ),
  };
}
