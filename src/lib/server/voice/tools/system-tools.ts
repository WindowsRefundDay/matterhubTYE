import "server-only";

import {
  getDisplayState,
  handleDisplayAction,
} from "@/lib/server/system/display/index";
import type { VoiceTool } from "./types";

export const systemTools: VoiceTool[] = [
  {
    name: "set_display_brightness",
    description:
      "Set the kiosk screen brightness. Use this when the user asks to dim, brighten, or set the screen brightness.",
    parameters: {
      type: "object",
      properties: {
        percent: {
          type: "number",
          description: "Brightness level from 0 (off) to 100 (full brightness).",
        },
      },
      required: ["percent"],
    },
    async execute(args) {
      const percent = Math.max(0, Math.min(100, args.percent as number));
      try {
        await handleDisplayAction({
          action: "set_brightness",
          brightnessPercent: percent,
          persist: true,
        });
        return { success: true, message: `Display brightness set to ${percent}%.` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Failed to set brightness: ${message}` };
      }
    },
  },

  {
    name: "set_display_power",
    description:
      "Turn the kiosk screen on or off. Use when the user says 'turn off the screen', 'sleep the display', etc.",
    parameters: {
      type: "object",
      properties: {
        on: {
          type: "boolean",
          description: "true to turn the display on, false to turn it off.",
        },
      },
      required: ["on"],
    },
    async execute(args) {
      const on = args.on as boolean;
      try {
        await handleDisplayAction({ action: "set_power", on });
        return {
          success: true,
          message: `Display turned ${on ? "on" : "off"}.`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Failed to set display power: ${message}` };
      }
    },
  },

  {
    name: "get_system_status",
    description:
      "Get current kiosk system status including screen brightness and power state. Use when the user asks what the brightness is or whether the screen is on.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    async execute() {
      try {
        const state = await getDisplayState();
        const status = [
          `Display: ${state.screenOn ? "on" : "off"}`,
          `Brightness: ${state.brightnessPercent}%`,
          state.supported ? "Hardware display control active" : "Mock display mode",
        ].join(", ");
        return { success: true, message: status };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Failed to get system status: ${message}` };
      }
    },
  },
];
