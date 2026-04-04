import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const BRIGHTNESS_PATH =
  process.env.MATTERHUB_DISPLAY_BRIGHTNESS_PATH ??
  "/sys/class/backlight/10-0045/brightness";
const ACTUAL_BRIGHTNESS_PATH =
  process.env.MATTERHUB_DISPLAY_ACTUAL_BRIGHTNESS_PATH ??
  "/sys/class/backlight/10-0045/actual_brightness";
const MAX_BRIGHTNESS_PATH =
  process.env.MATTERHUB_DISPLAY_MAX_BRIGHTNESS_PATH ??
  "/sys/class/backlight/10-0045/max_brightness";
const SETTINGS_FILE =
  process.env.MATTERHUB_DISPLAY_SETTINGS_FILE ??
  path.join(process.cwd(), ".tmp", "display-settings.json");

interface DisplaySettings {
  autoSleepEnabled: boolean;
  idleTimeoutSeconds: number;
  preferredBrightnessPercent: number;
  lastOnBrightnessPercent: number;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  autoSleepEnabled: true,
  idleTimeoutSeconds: 30,
  preferredBrightnessPercent: 100,
  lastOnBrightnessPercent: 100,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function loadSettings() {
  try {
    const data = JSON.parse(await readFile(SETTINGS_FILE, "utf8")) as Partial<DisplaySettings>;
    return {
      autoSleepEnabled:
        typeof data.autoSleepEnabled === "boolean"
          ? data.autoSleepEnabled
          : DEFAULT_SETTINGS.autoSleepEnabled,
      idleTimeoutSeconds:
        typeof data.idleTimeoutSeconds === "number"
          ? clamp(Math.round(data.idleTimeoutSeconds), 10, 3600)
          : DEFAULT_SETTINGS.idleTimeoutSeconds,
      preferredBrightnessPercent:
        typeof data.preferredBrightnessPercent === "number"
          ? clamp(Math.round(data.preferredBrightnessPercent), 0, 100)
          : DEFAULT_SETTINGS.preferredBrightnessPercent,
      lastOnBrightnessPercent:
        typeof data.lastOnBrightnessPercent === "number"
          ? clamp(Math.round(data.lastOnBrightnessPercent), 1, 100)
          : DEFAULT_SETTINGS.lastOnBrightnessPercent,
    } satisfies DisplaySettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings: DisplaySettings) {
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

async function readDisplayState() {
  const settings = await loadSettings();
  const supported = await fileExists(BRIGHTNESS_PATH) && (await fileExists(MAX_BRIGHTNESS_PATH));

  if (!supported) {
    return {
      supported: false,
      screenOn: true,
      brightnessPercent: settings.preferredBrightnessPercent,
      maxBrightness: null,
      autoSleepEnabled: settings.autoSleepEnabled,
      idleTimeoutSeconds: settings.idleTimeoutSeconds,
      lastOnBrightnessPercent: settings.lastOnBrightnessPercent,
    };
  }

  const [maxRaw, brightnessRaw] = await Promise.all([
    readFile(MAX_BRIGHTNESS_PATH, "utf8"),
    readFile(ACTUAL_BRIGHTNESS_PATH, "utf8").catch(() => readFile(BRIGHTNESS_PATH, "utf8")),
  ]);

  const maxBrightness = clamp(toInt(maxRaw.trim()), 1, 65535);
  const brightness = clamp(toInt(brightnessRaw.trim()), 0, maxBrightness);
  const brightnessPercent = Math.round((brightness / maxBrightness) * 100);

  return {
    supported: true,
    screenOn: brightness > 0,
    brightnessPercent,
    maxBrightness,
    autoSleepEnabled: settings.autoSleepEnabled,
    idleTimeoutSeconds: settings.idleTimeoutSeconds,
    lastOnBrightnessPercent: settings.lastOnBrightnessPercent,
  };
}

async function writeBrightnessPercent(percent: number) {
  const maxBrightness = clamp(
    toInt((await readFile(MAX_BRIGHTNESS_PATH, "utf8")).trim()),
    1,
    65535
  );
  const raw = Math.round((clamp(percent, 0, 100) / 100) * maxBrightness);
  await writeFile(BRIGHTNESS_PATH, `${raw}\n`, "utf8");
  return maxBrightness;
}

export async function GET() {
  try {
    return NextResponse.json(await readDisplayState());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as
    | { action: "set_brightness"; brightnessPercent: number }
    | { action: "set_power"; on: boolean }
    | { action: "set_auto_sleep"; enabled: boolean }
    | { action: "set_idle_timeout"; idleTimeoutSeconds: number };

  try {
    const settings = await loadSettings();
    switch (body.action) {
      case "set_brightness": {
        const brightnessPercent = clamp(Math.round(body.brightnessPercent), 0, 100);
        await writeBrightnessPercent(brightnessPercent);
        settings.preferredBrightnessPercent = brightnessPercent;
        if (brightnessPercent > 0) {
          settings.lastOnBrightnessPercent = clamp(brightnessPercent, 1, 100);
        }
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_power": {
        if (body.on) {
          const restored = clamp(
            settings.lastOnBrightnessPercent || settings.preferredBrightnessPercent || 100,
            1,
            100
          );
          await writeBrightnessPercent(restored);
          settings.preferredBrightnessPercent = restored;
        } else {
          const state = await readDisplayState();
          if (state.supported && state.brightnessPercent > 0) {
            settings.lastOnBrightnessPercent = clamp(state.brightnessPercent, 1, 100);
          }
          await writeBrightnessPercent(0);
        }
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_auto_sleep": {
        settings.autoSleepEnabled = !!body.enabled;
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_idle_timeout": {
        settings.idleTimeoutSeconds = clamp(Math.round(body.idleTimeoutSeconds), 10, 3600);
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
