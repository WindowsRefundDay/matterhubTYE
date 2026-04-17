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
      commandPrefix: "sudo -n",
      commandTimeout: 15000,
    },
    {
      runCommand(command) {
        switch (command) {
          case "sudo -n nmcli radio wifi":
            return "enabled";
          case "sudo -n nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status":
            return "wlan0:wifi:connected:MyWifi\neth0:ethernet:connected:Wired";
          case 'sudo -n nmcli -t -f 802-11-wireless.ssid,IP4.ADDRESS,IP4.GATEWAY,IP4.DNS,802-11-wireless-security.key-mgmt connection show "MyWifi"':
            return [
              "802-11-wireless.ssid:MyWifi",
              "IP4.ADDRESS[1]:192.168.1.10/24",
              "IP4.GATEWAY:192.168.1.1",
              "IP4.DNS[1]:1.1.1.1",
              "802-11-wireless-security.key-mgmt:wpa-psk",
            ].join("\n");
          case "sudo -n nmcli -t -f SIGNAL,FREQ,RATE,BSSID dev wifi list ifname wlan0 --rescan no":
            return "78:2412 MHz:195 Mbit/s:AA-BB-CC";
          case "sudo -n nmcli --escape no -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list ifname wlan0 --rescan no":
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

test("WifiClient performs an active scan only while disconnected", async () => {
  const { WifiClient } = await importCompiled("lib/server/system/wifi/client");

  const commands = [];
  const client = new WifiClient(
    {
      mode: "hardware",
      interface: "wlan0",
      commandPrefix: "sudo -n",
      commandTimeout: 15000,
    },
    {
      runCommand(command) {
        commands.push(command);
        switch (command) {
          case "sudo -n nmcli radio wifi":
            return "enabled";
          case "sudo -n nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status":
            return "wlan0:wifi:disconnected:\neth0:ethernet:disconnected:";
          case "sudo -n nmcli --escape no -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list ifname wlan0":
            return ":Guest:40:none";
          default:
            throw new Error(`Unexpected command: ${command}`);
        }
      },
    },
  );

  const status = await client.getStatus();

  assert.equal(status.wlanState, "disconnected");
  assert.deepEqual(commands, [
    "sudo -n nmcli radio wifi",
    "sudo -n nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status",
    "sudo -n nmcli --escape no -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list ifname wlan0",
  ]);
  assert.deepEqual(status.networks.map((network) => network.ssid), ["Guest"]);
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

test("AudioClient reads sink and source status using injected command dependencies", async () => {
  const { AudioClient } = await importCompiled("lib/server/system/audio/client");

  const client = new AudioClient(
    {
      mode: "hardware",
      commandPrefix: "",
      commandTimeout: 20000,
      statusCommand: "wpctl",
      statusAvailable: true,
      speakerTestCommand: "speaker-test",
      speakerTestAvailable: true,
      recordCommand: "arecord",
      recordAvailable: true,
      playbackCommand: "aplay",
      playbackAvailable: true,
      micTestDurationSeconds: 3,
      micTestFile: "/tmp/audio-mic-test.wav",
    },
    {
      async mkdir() {},
      async rm() {},
      runCommand(command) {
        switch (command) {
          case "wpctl inspect @DEFAULT_AUDIO_SINK@":
            return 'node.description = "HDMI / DisplayPort 2 Output"';
          case "wpctl get-volume @DEFAULT_AUDIO_SINK@":
            return "Volume: 0.72";
          case "wpctl inspect @DEFAULT_AUDIO_SOURCE@":
            return 'device.description = "USB Microphone"';
          case "wpctl get-volume @DEFAULT_AUDIO_SOURCE@":
            return "Volume: 0.33 [MUTED]";
          default:
            throw new Error(`Unexpected command: ${command}`);
        }
      },
    },
  );

  const status = await client.getStatus();

  assert.equal(status.supported, true);
  assert.equal(status.backend, "pipewire");
  assert.equal(status.output.available, true);
  assert.equal(status.output.label, "HDMI / DisplayPort 2 Output");
  assert.equal(status.output.volumePercent, 72);
  assert.equal(status.output.muted, false);
  assert.equal(status.input.available, true);
  assert.equal(status.input.label, "USB Microphone");
  assert.equal(status.input.volumePercent, 33);
  assert.equal(status.input.muted, true);
  assert.equal(status.speakerTestAvailable, true);
  assert.equal(status.micTestAvailable, true);
});

test("AudioClient builds speaker and microphone test commands with injected dependencies", async () => {
  const { AudioClient } = await importCompiled("lib/server/system/audio/client");

  const commands = [];
  const mkdirCalls = [];
  const rmCalls = [];
  const client = new AudioClient(
    {
      mode: "hardware",
      commandPrefix: "env XDG_RUNTIME_DIR=/run/user/1000",
      commandTimeout: 20000,
      statusCommand: "wpctl",
      statusAvailable: true,
      speakerTestCommand: "speaker-test",
      speakerTestAvailable: true,
      recordCommand: "arecord",
      recordAvailable: true,
      playbackCommand: "aplay",
      playbackAvailable: true,
      micTestDurationSeconds: 3,
      micTestFile: "/tmp/audio tests/mic check.wav",
    },
    {
      async mkdir(filePath, options) {
        mkdirCalls.push([filePath, options]);
      },
      async rm(filePath, options) {
        rmCalls.push([filePath, options]);
      },
      runCommand(command) {
        commands.push(command);
        return "";
      },
    },
  );

  const speakerResult = client.runSpeakerTest();
  const micResult = await client.runMicTest();

  assert.equal(speakerResult.action, "speaker_test");
  assert.equal(micResult.action, "mic_test");
  assert.equal(micResult.artifactFile, "/tmp/audio tests/mic check.wav");
  assert.deepEqual(mkdirCalls, [[ "/tmp/audio tests", { recursive: true } ]]);
  assert.deepEqual(rmCalls, [[ "/tmp/audio tests/mic check.wav", { force: true } ]]);
  assert.deepEqual(commands, [
    "env XDG_RUNTIME_DIR=/run/user/1000 speaker-test -t sine -f 440 -l 1",
    "env XDG_RUNTIME_DIR=/run/user/1000 arecord -d 3 -f S16_LE -r 16000 -c 1 '/tmp/audio tests/mic check.wav'",
    "env XDG_RUNTIME_DIR=/run/user/1000 aplay '/tmp/audio tests/mic check.wav'",
  ]);
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
