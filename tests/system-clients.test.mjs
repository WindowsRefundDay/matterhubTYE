import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./test-helpers.mjs";

test("DisplayClient reads state from injected file dependencies", async () => {
  const { DisplayClient } = await importCompiled("lib/server/system/display/client");

  const files = new Map([
    ["/sys/backlight/brightness", "128\n"],
    ["/sys/backlight/actual_brightness", "128\n"],
    ["/sys/backlight/max_brightness", "255\n"],
    [
      "/tmp/display-settings.json",
      JSON.stringify({
        autoSleepEnabled: true,
        dimAfterSeconds: 45,
        turnOffAfterSeconds: 90,
        preferredBrightnessPercent: 75,
        dimmedBrightnessPercent: 20,
        lastOnBrightnessPercent: 75,
        keepAwakeDuringDay: true,
        dayStartsAt: "08:00",
        nightStartsAt: "21:00",
      }),
    ],
  ]);

  const client = new DisplayClient(
    {
      mode: "hardware",
      brightnessPath: "/sys/backlight/brightness",
      actualBrightnessPath: "/sys/backlight/actual_brightness",
      maxBrightnessPath: "/sys/backlight/max_brightness",
      settingsFile: "/tmp/display-settings.json",
    },
    createDisplayDeps(files),
  );

  const state = await client.getState();

  assert.equal(state.supported, true);
  assert.equal(state.screenOn, true);
  assert.equal(state.brightnessPercent, 50);
  assert.equal(state.dimAfterSeconds, 45);
  assert.equal(state.turnOffAfterSeconds, 90);
  assert.equal(state.keepAwakeDuringDay, true);
  assert.equal(state.dayStartsAt, "08:00");
});

test("DisplayClient updates persisted brightness state through injected file dependencies", async () => {
  const { DisplayClient } = await importCompiled("lib/server/system/display/client");

  const files = new Map([
    ["/sys/backlight/brightness", "128\n"],
    ["/sys/backlight/actual_brightness", "128\n"],
    ["/sys/backlight/max_brightness", "255\n"],
    ["/tmp/display-settings.json", JSON.stringify({ preferredBrightnessPercent: 50 })],
  ]);

  const client = new DisplayClient(
    {
      mode: "hardware",
      brightnessPath: "/sys/backlight/brightness",
      actualBrightnessPath: "/sys/backlight/actual_brightness",
      maxBrightnessPath: "/sys/backlight/max_brightness",
      settingsFile: "/tmp/display-settings.json",
    },
    createDisplayDeps(files),
  );

  const state = await client.setPower(false);
  const savedSettings = JSON.parse(files.get("/tmp/display-settings.json"));

  assert.equal(state.screenOn, false);
  assert.equal(state.brightnessPercent, 0);
  assert.equal(files.get("/sys/backlight/brightness"), "0\n");
  assert.equal(savedSettings.lastOnBrightnessPercent, 50);
});

test("WifiClient parses status using injected command dependencies", async () => {
  const { WifiClient } = await importCompiled("lib/server/system/wifi/client");

  const client = new WifiClient(
    {
      mode: "hardware",
      interface: "wlan0",
      commandPrefix: "sudo",
      commandTimeout: 15000,
    },
    {
      runCommand(command) {
        switch (command) {
          case "sudo nmcli radio wifi":
            return "enabled";
          case "sudo nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status":
            return "wlan0:wifi:connected:MyWifi\neth0:ethernet:connected:Wired";
          case 'sudo nmcli -t -f 802-11-wireless.ssid,IP4.ADDRESS,IP4.GATEWAY,IP4.DNS,802-11-wireless-security.key-mgmt connection show "MyWifi"':
            return [
              "802-11-wireless.ssid:MyWifi",
              "IP4.ADDRESS[1]:192.168.1.10/24",
              "IP4.GATEWAY:192.168.1.1",
              "IP4.DNS[1]:1.1.1.1",
              "802-11-wireless-security.key-mgmt:wpa-psk",
            ].join("\n");
          case "sudo nmcli -t -f SIGNAL,FREQ,RATE,BSSID dev wifi list ifname wlan0 --rescan no":
            return "78:2412 MHz:195 Mbit/s:AA-BB-CC";
          case "sudo nmcli --escape no -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list ifname wlan0":
            return "*:MyWifi:78:WPA2\n:Guest:40:none";
          default:
            throw new Error(`Unexpected command: ${command}`);
        }
      },
    },
  );

  const status = await client.getStatus();

  assert.equal(status.wifiEnabled, true);
  assert.equal(status.wlanState, "connected");
  assert.equal(status.wlanConnection, "MyWifi");
  assert.equal(status.ethState, "connected");
  assert.equal(status.connectionDetails?.ip, "192.168.1.10/24");
  assert.equal(status.connectionDetails?.signal, 78);
  assert.deepEqual(
    status.networks.map((network) => network.ssid),
    ["MyWifi", "Guest"],
  );
});

test("WifiClient builds escaped connection commands with injected dependencies", async () => {
  const { WifiClient } = await importCompiled("lib/server/system/wifi/client");

  const commands = [];
  const client = new WifiClient(
    {
      mode: "hardware",
      interface: "wlan0",
      commandPrefix: "",
      commandTimeout: 15000,
    },
    {
      runCommand(command) {
        commands.push(command);
        if (command === 'nmcli connection delete "MyWifi"') {
          throw new Error("missing existing connection");
        }
        return "";
      },
    },
  );

  client.connect('My"Wifi', 'pa"ss');

  assert.deepEqual(commands, [
    'nmcli connection delete "MyWifi"',
    'nmcli device wifi connect "MyWifi" password "pass" ifname wlan0',
  ]);
});

test("audio test log helper appends and reads recent entries through injected file dependencies", async () => {
  const { appendAudioTestLog, readRecentAudioTestLogs } = await importCompiled(
    "lib/server/system/audio-test-log/index"
  );

  const files = new Map();
  const deps = {
    async mkdir() {},
    async readFile(filePath) {
      const value = files.get(filePath);
      if (value === undefined) {
        throw new Error(`Missing file: ${filePath}`);
      }

      return value;
    },
    async writeFile(filePath, value) {
      files.set(filePath, String(value));
    },
  };
  const env = {
    MATTERHUB_AUDIO_TEST_LOG_FILE: "/tmp/audio-test-events.jsonl",
  };

  await appendAudioTestLog(
    { event: "audio_test_opened", details: { output: "System default" } },
    deps,
    env,
  );
  await appendAudioTestLog(
    { event: "audio_test_play", details: { output: "System default" } },
    deps,
    env,
  );

  const entries = await readRecentAudioTestLogs(10, deps, env);

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.event, "audio_test_opened");
  assert.equal(entries[1]?.event, "audio_test_play");
});

function createDisplayDeps(files) {
  return {
    async mkdir() {},
    async readFile(filePath) {
      const value = files.get(filePath);
      if (value === undefined) {
        throw new Error(`Missing file: ${filePath}`);
      }

      return value;
    },
    async writeFile(filePath, value) {
      files.set(filePath, String(value));
      if (filePath === "/sys/backlight/brightness") {
        files.set("/sys/backlight/actual_brightness", String(value));
      }
    },
  };
}
