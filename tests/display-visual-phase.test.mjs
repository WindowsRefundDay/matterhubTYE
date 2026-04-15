import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./test-helpers.mjs";

const BASE_DISPLAY_STATE = {
  supported: true,
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

test("display visual phase identifies the dimming latency as mid-dim", async () => {
  const { getDisplayVisualPhase } = await importCompiled("components/app-shell");

  assert.equal(
    getDisplayVisualPhase({
      ...BASE_DISPLAY_STATE,
      brightnessPercent: 15,
    }),
    "mid-dim"
  );
});

test("display visual phase keeps unsupported and fully bright displays awake", async () => {
  const { getDisplayVisualPhase } = await importCompiled("components/app-shell");

  assert.equal(getDisplayVisualPhase(BASE_DISPLAY_STATE), "awake");
  assert.equal(
    getDisplayVisualPhase({
      ...BASE_DISPLAY_STATE,
      supported: false,
      brightnessPercent: 0,
      screenOn: false,
    }),
    "awake"
  );
});

test("display visual phase treats powered-off or zero-brightness displays as off", async () => {
  const { getDisplayVisualPhase } = await importCompiled("components/app-shell");

  assert.equal(
    getDisplayVisualPhase({
      ...BASE_DISPLAY_STATE,
      screenOn: false,
    }),
    "off"
  );
  assert.equal(
    getDisplayVisualPhase({
      ...BASE_DISPLAY_STATE,
      brightnessPercent: 0,
    }),
    "off"
  );
});
