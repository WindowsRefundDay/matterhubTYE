import { demoDevices, demoRooms, demoScenes } from "./fixtures";
import { mockWeather } from "@/data/weather";
import type { SmartHomeSnapshot } from "@/types/smart-home";

export function buildDemoSmartHomeSnapshot(
  reason: "env" | "toggle" = "env",
): SmartHomeSnapshot {
  const message =
    reason === "toggle"
      ? "Demo mode enabled via Settings toggle. Devices and rooms are simulated."
      : "Demo mode active (MATTERHUB_SMART_HOME_BACKEND=demo). Devices and rooms are simulated.";

  return {
    mode: "demo",
    generatedAt: new Date().toISOString(),
    rooms: demoRooms,
    devices: demoDevices,
    scenes: demoScenes,
    weather: mockWeather,
    diagnostics: [
      {
        level: "info",
        code: "demo_backend",
        message,
      },
    ],
    entityReferences: Object.fromEntries(
      demoDevices.map((device) => [
        device.id,
        {
          entityId: device.id,
          domain: device.type,
          deviceId: device.id,
          roomId: device.roomId,
          supportedActions: [],
        },
      ]),
    ),
  };
}
