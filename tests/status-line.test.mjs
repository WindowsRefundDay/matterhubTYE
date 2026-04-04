import assert from "node:assert/strict";
import test from "node:test";
import {
  importCompiled,
  renderCompiled,
  renderCompiledWithProvider,
} from "./test-helpers.mjs";

test("StatusLine preserves the combined active-device, light, and lock summary", async () => {
  const html = await renderCompiledWithProvider(
    "components/ambient/status-line",
    "StatusLine"
  );

  assert.match(html, /10 devices active · 3 lights on · Door locked/);
});

test("WeatherDisplay preserves the mock weather snapshot formatting", async () => {
  const { mockWeather } = await importCompiled("data/weather");
  const html = await renderCompiled(
    "components/ambient/weather-display",
    "WeatherDisplay",
    { weather: mockWeather }
  );

  assert.match(html, /68°/);
  assert.match(html, /H:74° L:58°/);
});
