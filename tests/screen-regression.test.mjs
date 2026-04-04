import assert from "node:assert/strict";
import test from "node:test";
import { renderCompiledWithProvider } from "./test-helpers.mjs";

test("ScreenRenderer preserves panel routing for key screens", async () => {
  const sharedProps = {
    onSelectRoom: () => undefined,
    onSelectDevice: () => undefined,
  };

  const roomsHtml = await renderCompiledWithProvider(
    "components/screen-renderer",
    "ScreenRenderer",
    { ...sharedProps, screen: "rooms" }
  );
  const devicesHtml = await renderCompiledWithProvider(
    "components/screen-renderer",
    "ScreenRenderer",
    { ...sharedProps, screen: "devices" }
  );
  const scenesHtml = await renderCompiledWithProvider(
    "components/screen-renderer",
    "ScreenRenderer",
    { ...sharedProps, screen: "scenes" }
  );
  const settingsHtml = await renderCompiledWithProvider(
    "components/screen-renderer",
    "ScreenRenderer",
    { ...sharedProps, screen: "settings" }
  );

  assert.match(roomsHtml, />Rooms</);
  assert.match(devicesHtml, />Devices</);
  assert.match(scenesHtml, />Scenes</);
  assert.match(settingsHtml, />Settings</);
});

test("RoomList preserves active-count summaries for every room", async () => {
  const html = await renderCompiledWithProvider(
    "components/rooms/room-list",
    "RoomList",
    { onSelectRoom: () => undefined }
  );

  assert.match(html, /Living Room/);
  assert.match(html, /3\/4 active/);
  assert.match(html, /Kitchen/);
  assert.match(html, /2\/2 active/);
  assert.match(html, /Bedroom/);
  assert.match(html, /2\/3 active/);
  assert.match(html, /Bathroom/);
  assert.match(html, /0\/1 active/);
});

test("SettingsPanel preserves the appliance status summary block", async () => {
  const html = await renderCompiledWithProvider(
    "components/settings/settings-panel",
    "SettingsPanel"
  );

  assert.match(html, /Awaiting appliance provisioning/);
  assert.match(html, /Home Assistant pairing is not configured yet/);
  assert.match(html, /Setup preview/);
  assert.match(html, /800 x 480/);
  assert.doesNotMatch(html, />Connected</);
});
