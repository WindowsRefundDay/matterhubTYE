import "server-only";

import type { HomeAssistantRuntimeConfig } from "@/lib/server/ha/types";
import type { SystemConfig } from "@/lib/server/system/config";

export interface ToolContext {
  haConfig: HomeAssistantRuntimeConfig | null;
  systemConfig: SystemConfig;
}

export interface ExecutedAction {
  tool: string;
  args: Record<string, unknown>;
  success: boolean;
  message: string;
}

/** Signals the client to take a UI-layer action that cannot be done server-side. */
export type ClientDirective =
  | { kind: "show_image"; url: string; caption?: string }
  | {
      kind: "navigate_to_screen";
      screen: "home" | "rooms" | "devices" | "scenes" | "settings";
    };

export interface ToolResult {
  success: boolean;
  /** Returned to Gemini as the function call result. */
  message: string;
  clientDirective?: ClientDirective;
}

export interface ToolParameterSchema {
  type: string;
  description: string;
  enum?: string[];
}

export interface VoiceTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameterSchema>;
    required: string[];
  };
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext
  ) => Promise<ToolResult>;
}
