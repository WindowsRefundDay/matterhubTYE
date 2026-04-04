import type { Device, Room, Scene, WeatherData } from "@/types";

export interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id?: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
}

export interface HomeAssistantArea {
  area_id: string;
  name: string;
  aliases?: string[];
  floor_id?: string | null;
}

export interface HomeAssistantDeviceRecord {
  id: string;
  area_id?: string | null;
  name_by_user?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
}

export interface HomeAssistantEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  area_id?: string | null;
  disabled_by?: string | null;
  hidden_by?: string | null;
  original_name?: string | null;
  entity_category?: string | null;
}

export interface HomeAssistantBootstrapSource {
  states: HomeAssistantState[];
  areas?: HomeAssistantArea[];
  devices?: HomeAssistantDeviceRecord[];
  entityRegistry?: HomeAssistantEntityRegistryEntry[];
}

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
  mode: "home-assistant" | "mock";
  generatedAt: string;
  rooms: Room[];
  devices: Device[];
  scenes: Scene[];
  weather: WeatherData | null;
  diagnostics: SmartHomeDiagnostic[];
  entityReferences: Record<string, SmartHomeEntityReference>;
}

export interface HomeAssistantRuntimeConfig {
  mode: "home-assistant" | "mock";
  baseUrl: string;
  token: string | null;
  tokenSource: "env" | "file" | "none";
  tokenPath: string | null;
  errors: string[];
}

export interface HomeAssistantServiceCall {
  domain: string;
  service: string;
  target?: {
    entity_id?: string[];
  };
  serviceData?: Record<string, unknown>;
}

export type SmartHomeActionRequest =
  | { kind: "toggle_device"; entityId: string; turnOn?: boolean }
  | { kind: "set_device_value"; entityId: string; value: number }
  | { kind: "set_temperature"; entityId: string; temperature: number }
  | { kind: "set_lock_state"; entityId: string; locked: boolean }
  | { kind: "activate_scene"; entityId: string };
