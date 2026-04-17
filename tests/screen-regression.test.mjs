import assert from "node:assert/strict";
import test from "node:test";
import { renderCompiled, renderCompiledWithProvider } from "./test-helpers.mjs";

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
  assert.match(html, /3 active/);
  assert.match(html, /Kitchen/);
  assert.match(html, /2 active/);
  assert.match(html, /Bedroom/);
  assert.match(html, /2 active/);
  assert.match(html, /Bathroom/);
  assert.match(html, /All off/);
});

test("SettingsPanel preserves the appliance status summary block", async () => {
  const html = await renderCompiledWithProvider(
    "components/settings/settings-panel",
    "SettingsPanel"
  );

  assert.match(html, /Provisioning/);
  assert.match(html, /Home Assistant pairing is not configured yet/);
  assert.match(html, /Setup Required/);
  assert.match(html, /Host-owned audio/);
  assert.match(html, /Routing/);
  assert.match(html, /Speaker output/);
  assert.match(html, /Microphone input/);
  assert.match(html, /800 x 480/);
  assert.doesNotMatch(html, />Connected</);
});

test("AudioPlayerPanel preserves the full-screen audio test shell", async () => {
  const html = await renderCompiled(
    "components/settings/audio-player-panel",
    "AudioPlayerPanel",
    {
      track: {
        id: "showtime-reference",
        title: "Rolling Like This",
        artist: "Don Toliver",
        src: "/audio/showtime-reference.mp3",
        accentLabel: "Showtime reference",
      },
      outputId: "system-default",
      outputLabel: "System default",
      support: {
        enumerateDevices: true,
        setSinkId: true,
        selectAudioOutput: true,
        secureContext: true,
      },
      onLogEvent: () => undefined,
      onBack: () => undefined,
    }
  );

  assert.match(html, /Audio pipeline test/i);
  assert.match(html, /Rolling Like This/);
  assert.match(html, /Don Toliver/);
  assert.match(html, /System default/);
  assert.match(html, /Testing local playback pipeline/i);
});
