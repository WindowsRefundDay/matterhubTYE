import type { Device, Room, Scene, WeatherData } from "@/types";

export interface SmartHomeDiagnostic {
  level: "info" | "warn" | "error";
  code: string;
  message: string;
  entityId?: string;
}

export interface SmartHomeEntityReference {
  entityId: string;
  domain: string;
  deviceId: string;
  roomId?: string;
  supportedActions: string[];
}

export interface SmartHomeSnapshot {
  mode: "home-assistant" | "demo";
  generatedAt: string;
  rooms: Room[];
  devices: Device[];
  scenes: Scene[];
  weather: WeatherData | null;
  diagnostics: SmartHomeDiagnostic[];
  entityReferences: Record<string, SmartHomeEntityReference>;
}

export type SmartHomeActionRequest =
  | { kind: "toggle_device"; entityId: string; turnOn?: boolean }
  | { kind: "set_device_value"; entityId: string; value: number }
  | { kind: "set_temperature"; entityId: string; temperature: number }
  | { kind: "set_lock_state"; entityId: string; locked: boolean }
  | { kind: "activate_scene"; entityId: string };
