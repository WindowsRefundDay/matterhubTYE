import "server-only";

import { loadSystemConfig } from "../config";
import { DisplayClient } from "./client";
import { getMockDisplayState, handleMockDisplayAction } from "./mock";
import type { DisplayState, DisplayAction } from "@/types/system";

export async function getDisplayState(): Promise<DisplayState> {
  const config = await loadSystemConfig();
  if (config.display.mode === "mock") return getMockDisplayState();
  return new DisplayClient(config.display).getState();
}

export async function handleDisplayAction(
  action: DisplayAction,
): Promise<DisplayState> {
  const config = await loadSystemConfig();
  if (config.display.mode === "mock") return handleMockDisplayAction(action);

  const client = new DisplayClient(config.display);

  switch (action.action) {
    case "set_brightness":
      return client.setBrightness(action.brightnessPercent, action.persist);
    case "set_power":
      return client.setPower(action.on);
    case "set_auto_sleep":
      return client.setAutoSleep(action.enabled);
    case "set_dim_after":
      return client.setDimAfter(action.dimAfterSeconds);
    case "set_turn_off_after":
      return client.setTurnOffAfter(action.turnOffAfterSeconds);
    case "set_dimmed_brightness":
      return client.setDimmedBrightness(action.dimmedBrightnessPercent);
    case "set_keep_awake_during_day":
      return client.setKeepAwakeDuringDay(action.enabled);
    case "set_day_window":
      return client.setDayWindow(action.dayStartsAt, action.nightStartsAt);
  }
}
