import "server-only";

import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config types (server-only, not exported to client)
// ---------------------------------------------------------------------------

export interface DisplayConfig {
  mode: "hardware" | "mock";
  brightnessPath: string;
  actualBrightnessPath: string;
  maxBrightnessPath: string;
  settingsFile: string;
}

export interface WifiConfig {
  mode: "hardware" | "mock";
  interface: string;
  commandPrefix: string;
  commandTimeout: number;
}

export interface AudioConfig {
  mode: "hardware" | "mock";
  commandPrefix: string;
  commandTimeout: number;
  playbackDevice: string;
  playbackLabel: string;
  captureDevice: string;
  captureLabel: string;
  mixerCommand: string;
  mixerAvailable: boolean;
  mixerControl: string;
  mixerCardIndex: number | null;
  statusCommand: string;
  statusAvailable: boolean;
  speakerTestCommand: string;
  speakerTestAvailable: boolean;
  recordCommand: string;
  recordAvailable: boolean;
  playbackCommand: string;
  playbackAvailable: boolean;
  micTestDurationSeconds: number;
  micTestFile: string;
}

export interface SystemConfig {
  display: DisplayConfig;
  wifi: WifiConfig;
  audio: AudioConfig;
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

async function fileAccessible(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function commandExists(name: string): boolean {
  try {
    execSync(`which ${name}`, { encoding: "utf8", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let cached: SystemConfig | null = null;

export async function loadSystemConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<SystemConfig> {
  if (cached) return cached;

  const brightnessPath =
    env.MATTERHUB_DISPLAY_BRIGHTNESS_PATH ??
    "/sys/class/backlight/10-0045/brightness";
  const actualBrightnessPath =
    env.MATTERHUB_DISPLAY_ACTUAL_BRIGHTNESS_PATH ??
    "/sys/class/backlight/10-0045/actual_brightness";
  const maxBrightnessPath =
    env.MATTERHUB_DISPLAY_MAX_BRIGHTNESS_PATH ??
    "/sys/class/backlight/10-0045/max_brightness";
  const settingsFile =
    env.MATTERHUB_DISPLAY_SETTINGS_FILE ??
    path.join(process.cwd(), ".tmp", "display-settings.json");

  const wifiInterface = env.MATTERHUB_WIFI_INTERFACE ?? "wlan0";
  const wifiCommandPrefix = env.MATTERHUB_WIFI_COMMAND_PREFIX ?? "sudo -n";
  const wifiCommandTimeout = Number(env.MATTERHUB_WIFI_COMMAND_TIMEOUT) || 15000;
  const audioCommandPrefix = env.MATTERHUB_AUDIO_COMMAND_PREFIX ?? "";
  const audioCommandTimeout = Number(env.MATTERHUB_AUDIO_COMMAND_TIMEOUT) || 20000;
  const audioPlaybackDevice = env.MATTERHUB_AUDIO_PLAYBACK_DEVICE ?? "hw:0,0";
  const audioPlaybackLabel =
    env.MATTERHUB_AUDIO_PLAYBACK_LABEL ?? "bcm2835 Headphones (3.5 mm jack)";
  const audioCaptureDevice = env.MATTERHUB_AUDIO_CAPTURE_DEVICE ?? "hw:1,0";
  const audioCaptureLabel =
    env.MATTERHUB_AUDIO_CAPTURE_LABEL ?? "USB microphone";
  const audioMixerCommand = env.MATTERHUB_AUDIO_MIXER_COMMAND ?? "amixer";
  const audioMixerControl = env.MATTERHUB_AUDIO_MIXER_CONTROL ?? "Headphone";
  const audioMixerCardIndexRaw = env.MATTERHUB_AUDIO_MIXER_CARD_INDEX;
  const audioMixerCardIndex =
    audioMixerCardIndexRaw == null || audioMixerCardIndexRaw.trim() === ""
      ? 0
      : Number(audioMixerCardIndexRaw);
  const audioStatusCommand = env.MATTERHUB_AUDIO_STATUS_COMMAND ?? "wpctl";
  const audioSpeakerTestCommand =
    env.MATTERHUB_AUDIO_SPEAKER_TEST_COMMAND ?? "speaker-test";
  const audioRecordCommand = env.MATTERHUB_AUDIO_RECORD_COMMAND ?? "arecord";
  const audioPlaybackCommand = env.MATTERHUB_AUDIO_PLAYBACK_COMMAND ?? "aplay";
  const audioMicTestDurationSeconds = Math.max(
    1,
    Number(env.MATTERHUB_AUDIO_MIC_TEST_DURATION_SECONDS) || 3,
  );
  const audioMicTestFile =
    env.MATTERHUB_AUDIO_MIC_TEST_FILE ??
    path.join(process.cwd(), ".tmp", "audio-mic-test.wav");

  // Auto-detect hardware availability
  const explicitMode = env.MATTERHUB_SYSTEM_MODE?.trim().toLowerCase();
  const forceHardware = explicitMode === "hardware";
  const forceMock = explicitMode === "mock";

  const displayHardwareAvailable =
    forceHardware || (!forceMock && (await fileAccessible(brightnessPath)));
  const wifiHardwareAvailable =
    forceHardware || (!forceMock && commandExists("nmcli"));
  const audioStatusAvailable = commandExists(audioStatusCommand);
  const audioMixerAvailable = commandExists(audioMixerCommand);
  const audioSpeakerTestAvailable = commandExists(audioSpeakerTestCommand);
  const audioRecordAvailable = commandExists(audioRecordCommand);
  const audioPlaybackAvailable = commandExists(audioPlaybackCommand);
  const audioHardwareAvailable =
    forceHardware ||
    (!forceMock &&
      (audioStatusAvailable ||
        audioSpeakerTestAvailable ||
        (audioRecordAvailable && audioPlaybackAvailable)));

  cached = {
    display: {
      mode: displayHardwareAvailable ? "hardware" : "mock",
      brightnessPath,
      actualBrightnessPath,
      maxBrightnessPath,
      settingsFile,
    },
    wifi: {
      mode: wifiHardwareAvailable ? "hardware" : "mock",
      interface: wifiInterface,
      commandPrefix: wifiCommandPrefix,
      commandTimeout: wifiCommandTimeout,
    },
    audio: {
      mode: audioHardwareAvailable ? "hardware" : "mock",
      commandPrefix: audioCommandPrefix,
      commandTimeout: audioCommandTimeout,
      playbackDevice: audioPlaybackDevice,
      playbackLabel: audioPlaybackLabel,
      captureDevice: audioCaptureDevice,
      captureLabel: audioCaptureLabel,
      mixerCommand: audioMixerCommand,
      mixerAvailable: audioMixerAvailable,
      mixerControl: audioMixerControl,
      mixerCardIndex:
        Number.isFinite(audioMixerCardIndex) ? audioMixerCardIndex : null,
      statusCommand: audioStatusCommand,
      statusAvailable: audioStatusAvailable,
      speakerTestCommand: audioSpeakerTestCommand,
      speakerTestAvailable: audioSpeakerTestAvailable,
      recordCommand: audioRecordCommand,
      recordAvailable: audioRecordAvailable,
      playbackCommand: audioPlaybackCommand,
      playbackAvailable: audioPlaybackAvailable,
      micTestDurationSeconds: audioMicTestDurationSeconds,
      micTestFile: audioMicTestFile,
    },
  };

  return cached;
}
