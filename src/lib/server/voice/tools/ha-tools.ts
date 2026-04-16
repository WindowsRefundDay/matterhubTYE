import "server-only";

import { HomeAssistantRestClient } from "@/lib/server/ha/rest";
import { resolveHomeAssistantServiceCall } from "@/lib/server/ha/service-actions";
import type { SmartHomeActionRequest } from "@/types/smart-home";
import type { VoiceTool, ToolContext, ToolResult } from "./types";

async function callHa(
  request: SmartHomeActionRequest,
  ctx: ToolContext
): Promise<ToolResult> {
  if (!ctx.haConfig || ctx.haConfig.mode === "mock") {
    return { success: true, message: "[Mock] Action acknowledged — no real device was changed." };
  }

  try {
    const serviceCall = resolveHomeAssistantServiceCall(request);
    const client = new HomeAssistantRestClient(ctx.haConfig);
    await client.callService(serviceCall);
    return { success: true, message: "Done." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed: ${message}` };
  }
}

export const haTools: VoiceTool[] = [
  {
    name: "toggle_device",
    description:
      "Turn a light, switch, fan, camera, or media player on or off. If turnOn is omitted, the device is toggled.",
    parameters: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "The entity_id of the device (e.g. light.living_room).",
        },
        turnOn: {
          type: "boolean",
          description: "true to turn on, false to turn off. Omit to toggle.",
        },
      },
      required: ["entityId"],
    },
    async execute(args, ctx) {
      return callHa(
        {
          kind: "toggle_device",
          entityId: args.entityId as string,
          ...(typeof args.turnOn === "boolean" ? { turnOn: args.turnOn } : {}),
        },
        ctx
      );
    },
  },

  {
    name: "set_device_value",
    description:
      "Set brightness (0–100) for lights, fan speed percentage, or media player volume (0–100).",
    parameters: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "The entity_id of the device.",
        },
        value: {
          type: "number",
          description: "Value from 0 to 100.",
        },
      },
      required: ["entityId", "value"],
    },
    async execute(args, ctx) {
      return callHa(
        {
          kind: "set_device_value",
          entityId: args.entityId as string,
          value: args.value as number,
        },
        ctx
      );
    },
  },

  {
    name: "set_temperature",
    description: "Set the target temperature on a climate or thermostat entity.",
    parameters: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "The entity_id of the climate device.",
        },
        temperature: {
          type: "number",
          description: "Target temperature in Celsius.",
        },
      },
      required: ["entityId", "temperature"],
    },
    async execute(args, ctx) {
      return callHa(
        {
          kind: "set_temperature",
          entityId: args.entityId as string,
          temperature: args.temperature as number,
        },
        ctx
      );
    },
  },

  {
    name: "set_lock_state",
    description: "Lock or unlock a lock entity.",
    parameters: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "The entity_id of the lock.",
        },
        locked: {
          type: "boolean",
          description: "true to lock, false to unlock.",
        },
      },
      required: ["entityId", "locked"],
    },
    async execute(args, ctx) {
      return callHa(
        {
          kind: "set_lock_state",
          entityId: args.entityId as string,
          locked: args.locked as boolean,
        },
        ctx
      );
    },
  },

  {
    name: "activate_scene",
    description: "Activate a scene by its entity_id.",
    parameters: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "The entity_id of the scene (must start with scene.).",
        },
      },
      required: ["entityId"],
    },
    async execute(args, ctx) {
      return callHa(
        {
          kind: "activate_scene",
          entityId: args.entityId as string,
        },
        ctx
      );
    },
  },
];
