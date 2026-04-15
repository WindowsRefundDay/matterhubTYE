import type {
  SmartHomeActionRequest,
  SmartHomeDiagnostic,
  SmartHomeEntityReference,
  SmartHomeSnapshot,
} from "@/types/smart-home";

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

export type {
  SmartHomeActionRequest,
  SmartHomeDiagnostic,
  SmartHomeEntityReference,
  SmartHomeSnapshot,
};
