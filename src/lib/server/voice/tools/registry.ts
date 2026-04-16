import "server-only";

import { haTools } from "./ha-tools";
import { systemTools } from "./system-tools";
import { futureTools } from "./future-tools";
import type { VoiceTool } from "./types";

/**
 * Returns all registered voice tools.
 * To add a new capability: create a tool file, add it to this array.
 * No other changes required.
 */
export function buildToolRegistry(): VoiceTool[] {
  return [...haTools, ...systemTools, ...futureTools];
}
