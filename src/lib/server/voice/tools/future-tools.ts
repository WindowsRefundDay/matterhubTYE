import "server-only";

import type { VoiceTool } from "./types";

/**
 * Scaffolded tools for future capabilities.
 * Add integrations here when ready — no other files need to change.
 */
export const futureTools: VoiceTool[] = [
  {
    name: "web_search",
    description:
      "Search the web for current information, news, weather, sports scores, general knowledge, or anything requiring up-to-date facts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query — be specific for best results.",
        },
      },
      required: ["query"],
    },
    // The executor intercepts this tool and runs a separate Gemini call with
    // Google Search grounding. execute() is a fallback only.
    async execute(args) {
      return {
        success: false,
        message: `Web search for "${args.query as string}" could not be completed.`,
      };
    },
  },

  {
    name: "show_image",
    description:
      "Display an image on the kiosk screen. Use when the user asks to show a photo, map, or visual.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL of the image to display.",
        },
        caption: {
          type: "string",
          description: "Optional caption to show below the image.",
        },
      },
      required: ["url"],
    },
    async execute(args) {
      return {
        success: true,
        message: "Image will be shown on screen.",
        clientDirective: {
          kind: "show_image" as const,
          url: args.url as string,
          ...(args.caption ? { caption: args.caption as string } : {}),
        },
      };
    },
  },

  {
    name: "navigate_to_screen",
    description:
      "Navigate the kiosk UI to a specific screen. Use when the user says 'show me my devices', 'go to rooms', 'open settings', etc.",
    parameters: {
      type: "object",
      properties: {
        screen: {
          type: "string",
          description: "The screen to navigate to.",
          enum: ["home", "rooms", "devices", "scenes", "settings"],
        },
      },
      required: ["screen"],
    },
    async execute(args) {
      const screen = args.screen as
        | "home"
        | "rooms"
        | "devices"
        | "scenes"
        | "settings";
      return {
        success: true,
        message: `Navigating to ${screen}.`,
        clientDirective: { kind: "navigate_to_screen" as const, screen },
      };
    },
  },
];
