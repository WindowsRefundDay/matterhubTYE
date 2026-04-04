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
  dimAfterSeconds: number;
  turnOffAfterSeconds: number;
  preferredBrightnessPercent: number;
  dimmedBrightnessPercent: number;
  lastOnBrightnessPercent: number;
  keepAwakeDuringDay: boolean;
  dayStartsAt: string;
  nightStartsAt: string;
}

const DEFAULT_SETTINGS: DisplaySettings = {
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

function normalizeClock(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return fallback;
  }

  const hours = clamp(Number.parseInt(match[1] ?? "0", 10), 0, 23);
  const minutes = clamp(Number.parseInt(match[2] ?? "0", 10), 0, 59);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
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
    const data = JSON.parse(
      await readFile(SETTINGS_FILE, "utf8")
    ) as Partial<DisplaySettings>;

    return {
      autoSleepEnabled:
        typeof data.autoSleepEnabled === "boolean"
          ? data.autoSleepEnabled
          : DEFAULT_SETTINGS.autoSleepEnabled,
      dimAfterSeconds:
        typeof data.dimAfterSeconds === "number"
          ? clamp(Math.round(data.dimAfterSeconds), 10, 3600)
          : DEFAULT_SETTINGS.dimAfterSeconds,
      turnOffAfterSeconds:
        typeof data.turnOffAfterSeconds === "number"
          ? clamp(Math.round(data.turnOffAfterSeconds), 5, 3600)
          : DEFAULT_SETTINGS.turnOffAfterSeconds,
      preferredBrightnessPercent:
        typeof data.preferredBrightnessPercent === "number"
          ? clamp(Math.round(data.preferredBrightnessPercent), 0, 100)
          : DEFAULT_SETTINGS.preferredBrightnessPercent,
      dimmedBrightnessPercent:
        typeof data.dimmedBrightnessPercent === "number"
          ? clamp(Math.round(data.dimmedBrightnessPercent), 1, 100)
          : DEFAULT_SETTINGS.dimmedBrightnessPercent,
      lastOnBrightnessPercent:
        typeof data.lastOnBrightnessPercent === "number"
          ? clamp(Math.round(data.lastOnBrightnessPercent), 1, 100)
          : DEFAULT_SETTINGS.lastOnBrightnessPercent,
      keepAwakeDuringDay:
        typeof data.keepAwakeDuringDay === "boolean"
          ? data.keepAwakeDuringDay
          : DEFAULT_SETTINGS.keepAwakeDuringDay,
      dayStartsAt: normalizeClock(data.dayStartsAt, DEFAULT_SETTINGS.dayStartsAt),
      nightStartsAt: normalizeClock(data.nightStartsAt, DEFAULT_SETTINGS.nightStartsAt),
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
  const supported = (await fileExists(BRIGHTNESS_PATH)) &&
    (await fileExists(MAX_BRIGHTNESS_PATH));

  if (!supported) {
    return {
      supported: false,
      screenOn: true,
      brightnessPercent: settings.preferredBrightnessPercent,
      maxBrightness: null,
      autoSleepEnabled: settings.autoSleepEnabled,
      dimAfterSeconds: settings.dimAfterSeconds,
      turnOffAfterSeconds: settings.turnOffAfterSeconds,
      preferredBrightnessPercent: settings.preferredBrightnessPercent,
      dimmedBrightnessPercent: settings.dimmedBrightnessPercent,
      lastOnBrightnessPercent: settings.lastOnBrightnessPercent,
      keepAwakeDuringDay: settings.keepAwakeDuringDay,
      dayStartsAt: settings.dayStartsAt,
      nightStartsAt: settings.nightStartsAt,
    };
  }

  const [maxRaw, brightnessRaw] = await Promise.all([
    readFile(MAX_BRIGHTNESS_PATH, "utf8"),
    readFile(ACTUAL_BRIGHTNESS_PATH, "utf8").catch(() =>
      readFile(BRIGHTNESS_PATH, "utf8")
    ),
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
    dimAfterSeconds: settings.dimAfterSeconds,
    turnOffAfterSeconds: settings.turnOffAfterSeconds,
    preferredBrightnessPercent: settings.preferredBrightnessPercent,
    dimmedBrightnessPercent: settings.dimmedBrightnessPercent,
    lastOnBrightnessPercent: settings.lastOnBrightnessPercent,
    keepAwakeDuringDay: settings.keepAwakeDuringDay,
    dayStartsAt: settings.dayStartsAt,
    nightStartsAt: settings.nightStartsAt,
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

type DisplayRequestBody =
  | { action: "set_brightness"; brightnessPercent: number; persist?: boolean }
  | { action: "set_power"; on: boolean }
  | { action: "set_auto_sleep"; enabled: boolean }
  | { action: "set_dim_after"; dimAfterSeconds: number }
  | { action: "set_turn_off_after"; turnOffAfterSeconds: number }
  | { action: "set_dimmed_brightness"; dimmedBrightnessPercent: number }
  | { action: "set_keep_awake_during_day"; enabled: boolean }
  | { action: "set_day_window"; dayStartsAt: string; nightStartsAt: string };

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
  const body = (await request.json()) as DisplayRequestBody;

  try {
    const settings = await loadSettings();

    switch (body.action) {
      case "set_brightness": {
        const brightnessPercent = clamp(Math.round(body.brightnessPercent), 0, 100);
        await writeBrightnessPercent(brightnessPercent);

        if (body.persist ?? true) {
          settings.preferredBrightnessPercent = brightnessPercent;
          if (brightnessPercent > 0) {
            settings.lastOnBrightnessPercent = clamp(brightnessPercent, 1, 100);
          }
          await saveSettings(settings);
        }
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
      case "set_dim_after": {
        settings.dimAfterSeconds = clamp(Math.round(body.dimAfterSeconds), 10, 3600);
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_turn_off_after": {
        settings.turnOffAfterSeconds = clamp(
          Math.round(body.turnOffAfterSeconds),
          5,
          3600
        );
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_dimmed_brightness": {
        settings.dimmedBrightnessPercent = clamp(
          Math.round(body.dimmedBrightnessPercent),
          1,
          100
        );
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_keep_awake_during_day": {
        settings.keepAwakeDuringDay = !!body.enabled;
        await saveSettings(settings);
        return NextResponse.json({ status: "ok", ...(await readDisplayState()) });
      }
      case "set_day_window": {
        settings.dayStartsAt = normalizeClock(body.dayStartsAt, settings.dayStartsAt);
        settings.nightStartsAt = normalizeClock(body.nightStartsAt, settings.nightStartsAt);
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
