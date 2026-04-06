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

export interface SystemConfig {
  display: DisplayConfig;
  wifi: WifiConfig;
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
  const wifiCommandPrefix = env.MATTERHUB_WIFI_COMMAND_PREFIX ?? "sudo";
  const wifiCommandTimeout = Number(env.MATTERHUB_WIFI_COMMAND_TIMEOUT) || 15000;

  // Auto-detect hardware availability
  const explicitMode = env.MATTERHUB_SYSTEM_MODE?.trim().toLowerCase();
  const forceHardware = explicitMode === "hardware";
  const forceMock = explicitMode === "mock";

  const displayHardwareAvailable =
    forceHardware || (!forceMock && (await fileAccessible(brightnessPath)));
  const wifiHardwareAvailable =
    forceHardware || (!forceMock && commandExists("nmcli"));

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
  };

  return cached;
}
