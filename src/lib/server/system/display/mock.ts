import type { DisplayState, DisplayAction } from "@/types/system";

const DEFAULT_STATE: DisplayState = {
  supported: false,
  screenOn: true,
  brightnessPercent: 100,
  maxBrightness: null,
  autoSleepEnabled: true,
  dimAfterSeconds: 30,
  turnOffAfterSeconds: 30,
  preferredBrightnessPercent: 100,
  dimmedBrightnessPercent: 15,
  lastOnBrightnessPercent: 100,
  keepAwakeDuringDay: false,
  dayStartsAt: "07:00",
  nightStartsAt: "22:00",
};

const state = { ...DEFAULT_STATE };

export function getMockDisplayState(): DisplayState {
  return { ...state };
}

export function handleMockDisplayAction(action: DisplayAction): DisplayState {
  switch (action.action) {
    case "set_brightness":
      state.brightnessPercent = action.brightnessPercent;
      break;
    case "set_power":
      state.screenOn = action.on;
      break;
    case "set_auto_sleep":
      state.autoSleepEnabled = action.enabled;
      break;
    case "set_dim_after":
      state.dimAfterSeconds = action.dimAfterSeconds;
      break;
    case "set_turn_off_after":
      state.turnOffAfterSeconds = action.turnOffAfterSeconds;
      break;
    case "set_dimmed_brightness":
      state.dimmedBrightnessPercent = action.dimmedBrightnessPercent;
      break;
    case "set_keep_awake_during_day":
      state.keepAwakeDuringDay = action.enabled;
      break;
    case "set_day_window":
      state.dayStartsAt = action.dayStartsAt;
      state.nightStartsAt = action.nightStartsAt;
      break;
  }
  return { ...state };
}
