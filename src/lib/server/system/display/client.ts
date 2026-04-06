import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DisplayConfig } from "../config";
import type { DisplayState, DisplaySettings } from "@/types/system";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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
  if (!value) return fallback;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return fallback;
  const hours = clamp(Number.parseInt(match[1] ?? "0", 10), 0, 23);
  const minutes = clamp(Number.parseInt(match[2] ?? "0", 10), 0, 59);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DisplayClient
// ---------------------------------------------------------------------------

export class DisplayClient {
  constructor(private readonly config: DisplayConfig) {}

  // ── Read state ──────────────────────────────────────────────────────────

  async getState(): Promise<DisplayState> {
    const settings = await this.loadSettings();
    const supported = await this.isHardwareAvailable();

    if (!supported) {
      return {
        supported: false,
        screenOn: true,
        brightnessPercent: settings.preferredBrightnessPercent,
        maxBrightness: null,
        ...settings,
      };
    }

    const [maxRaw, brightnessRaw] = await Promise.all([
      readFile(this.config.maxBrightnessPath, "utf8"),
      readFile(this.config.actualBrightnessPath, "utf8").catch(() =>
        readFile(this.config.brightnessPath, "utf8"),
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
      ...settings,
    };
  }

  // ── Brightness ──────────────────────────────────────────────────────────

  async setBrightness(
    percent: number,
    persist = true,
  ): Promise<DisplayState> {
    const brightnessPercent = clamp(Math.round(percent), 0, 100);
    await this.writeBrightnessPercent(brightnessPercent);

    if (persist) {
      const settings = await this.loadSettings();
      settings.preferredBrightnessPercent = brightnessPercent;
      if (brightnessPercent > 0) {
        settings.lastOnBrightnessPercent = clamp(brightnessPercent, 1, 100);
      }
      await this.saveSettings(settings);
    }

    return this.getState();
  }

  // ── Power ───────────────────────────────────────────────────────────────

  async setPower(on: boolean): Promise<DisplayState> {
    const settings = await this.loadSettings();

    if (on) {
      const restored = clamp(
        settings.lastOnBrightnessPercent ||
          settings.preferredBrightnessPercent ||
          100,
        1,
        100,
      );
      await this.writeBrightnessPercent(restored);
    } else {
      const state = await this.getState();
      if (state.supported && state.brightnessPercent > 0) {
        settings.lastOnBrightnessPercent = clamp(
          state.brightnessPercent,
          1,
          100,
        );
      }
      await this.writeBrightnessPercent(0);
    }

    await this.saveSettings(settings);
    return this.getState();
  }

  // ── Settings mutations ──────────────────────────────────────────────────

  async setAutoSleep(enabled: boolean): Promise<DisplayState> {
    const s = await this.loadSettings();
    s.autoSleepEnabled = !!enabled;
    await this.saveSettings(s);
    return this.getState();
  }

  async setDimAfter(seconds: number): Promise<DisplayState> {
    const s = await this.loadSettings();
    s.dimAfterSeconds = clamp(Math.round(seconds), 10, 3600);
    await this.saveSettings(s);
    return this.getState();
  }

  async setTurnOffAfter(seconds: number): Promise<DisplayState> {
    const s = await this.loadSettings();
    s.turnOffAfterSeconds = clamp(Math.round(seconds), 5, 3600);
    await this.saveSettings(s);
    return this.getState();
  }

  async setDimmedBrightness(percent: number): Promise<DisplayState> {
    const s = await this.loadSettings();
    s.dimmedBrightnessPercent = clamp(Math.round(percent), 1, 100);
    await this.saveSettings(s);
    return this.getState();
  }

  async setKeepAwakeDuringDay(enabled: boolean): Promise<DisplayState> {
    const s = await this.loadSettings();
    s.keepAwakeDuringDay = !!enabled;
    await this.saveSettings(s);
    return this.getState();
  }

  async setDayWindow(
    dayStartsAt: string,
    nightStartsAt: string,
  ): Promise<DisplayState> {
    const s = await this.loadSettings();
    s.dayStartsAt = normalizeClock(dayStartsAt, s.dayStartsAt);
    s.nightStartsAt = normalizeClock(nightStartsAt, s.nightStartsAt);
    await this.saveSettings(s);
    return this.getState();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async isHardwareAvailable(): Promise<boolean> {
    if (this.config.mode === "mock") return false;
    try {
      await readFile(this.config.brightnessPath, "utf8");
      await readFile(this.config.maxBrightnessPath, "utf8");
      return true;
    } catch {
      return false;
    }
  }

  private async loadSettings(): Promise<DisplaySettings> {
    try {
      const data = JSON.parse(
        await readFile(this.config.settingsFile, "utf8"),
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
        dayStartsAt: normalizeClock(
          data.dayStartsAt,
          DEFAULT_SETTINGS.dayStartsAt,
        ),
        nightStartsAt: normalizeClock(
          data.nightStartsAt,
          DEFAULT_SETTINGS.nightStartsAt,
        ),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private async saveSettings(settings: DisplaySettings): Promise<void> {
    await mkdir(path.dirname(this.config.settingsFile), { recursive: true });
    await writeFile(
      this.config.settingsFile,
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8",
    );
  }

  private async writeBrightnessPercent(percent: number): Promise<void> {
    const maxBrightness = clamp(
      toInt((await readFile(this.config.maxBrightnessPath, "utf8")).trim()),
      1,
      65535,
    );
    const raw = Math.round((clamp(percent, 0, 100) / 100) * maxBrightness);
    await writeFile(this.config.brightnessPath, `${raw}\n`, "utf8");
  }
}
