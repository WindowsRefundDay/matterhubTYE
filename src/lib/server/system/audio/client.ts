import { execSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { AudioConfig } from "../config";
import { SystemCommandError, SystemHardwareError } from "../errors";
import type { AudioEndpointStatus, AudioStatus, AudioTestResult } from "./types";

interface AudioClientDeps {
  mkdir: typeof mkdir;
  rm: typeof rm;
  runCommand: (command: string, timeout: number) => string;
}

const defaultAudioClientDeps: AudioClientDeps = {
  mkdir,
  rm,
  runCommand: (command, timeout) =>
    execSync(command, {
      timeout,
      encoding: "utf8",
    }).trim(),
};

function quoteShellArg(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseVolume(output: string): Pick<AudioEndpointStatus, "volumePercent" | "muted"> {
  const match = /Volume:\s+([0-9.]+)(?:\s+\[(MUTED)\])?/i.exec(output);
  if (!match) {
    return { volumePercent: null, muted: null };
  }

  const volumePercent = Math.max(
    0,
    Math.min(150, Math.round(Number.parseFloat(match[1] ?? "0") * 100)),
  );

  return {
    volumePercent: Number.isFinite(volumePercent) ? volumePercent : null,
    muted: match[2] === "MUTED",
  };
}

function parseLabel(output: string): string | null {
  const patterns = [
    /node\.description\s*=\s*"([^"]+)"/,
    /device\.description\s*=\s*"([^"]+)"/,
    /node\.nick\s*=\s*"([^"]+)"/,
    /device\.nick\s*=\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(output);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function parseAmixerVolume(
  output: string,
): Pick<AudioEndpointStatus, "volumePercent" | "muted"> {
  const match = /\[(\d+)%\].*?\[(on|off)\]/i.exec(output);
  if (!match) {
    return { volumePercent: null, muted: null };
  }

  return {
    volumePercent: Number.parseInt(match[1] ?? "", 10),
    muted: (match[2] ?? "").toLowerCase() === "off",
  };
}

export class AudioClient {
  constructor(
    private readonly config: AudioConfig,
    private readonly deps: AudioClientDeps = defaultAudioClientDeps,
  ) {}

  async getStatus(): Promise<AudioStatus> {
    const output = await this.inspectEndpoint("@DEFAULT_AUDIO_SINK@");
    const input = await this.inspectEndpoint("@DEFAULT_AUDIO_SOURCE@");

    return {
      supported:
        this.config.statusAvailable ||
        this.config.speakerTestAvailable ||
        (this.config.recordAvailable && this.config.playbackAvailable),
      mode: this.config.mode,
      backend: this.config.statusAvailable ? "pipewire" : "unknown",
      speakerTestAvailable: this.config.speakerTestAvailable,
      micTestAvailable: this.config.recordAvailable && this.config.playbackAvailable,
      output,
      input,
    };
  }

  runSpeakerTest(): AudioTestResult {
    if (!this.config.speakerTestAvailable) {
      throw new SystemHardwareError(
        "Speaker test command is unavailable.",
        "audio",
      );
    }

    this.run(
      `${this.config.speakerTestCommand} -D ${quoteShellArg(this.config.playbackDevice)} -t sine -f 440 -l 1`,
    );
    return {
      action: "speaker_test",
      ok: true,
      mode: this.config.mode,
      message: "Speaker test completed.",
      artifactFile: null,
    };
  }

  async runMicTest(): Promise<AudioTestResult> {
    if (!this.config.recordAvailable || !this.config.playbackAvailable) {
      throw new SystemHardwareError(
        "Microphone test commands are unavailable.",
        "audio",
      );
    }

    await this.deps.mkdir(path.dirname(this.config.micTestFile), {
      recursive: true,
    });
    await this.deps.rm(this.config.micTestFile, { force: true });

    const fileArg = quoteShellArg(this.config.micTestFile);
    this.run(
      `${this.config.recordCommand} -D ${quoteShellArg(this.config.captureDevice)} -d ${this.config.micTestDurationSeconds} -f S16_LE -r 16000 -c 1 ${fileArg}`,
      this.config.commandTimeout + this.config.micTestDurationSeconds * 1000,
    );
    this.run(
      `${this.config.playbackCommand} -D ${quoteShellArg(this.config.playbackDevice)} ${fileArg}`,
      this.config.commandTimeout + this.config.micTestDurationSeconds * 1000,
    );

    return {
      action: "mic_test",
      ok: true,
      mode: this.config.mode,
      message: `Recorded a ${this.config.micTestDurationSeconds}-second microphone clip and played it back.`,
      artifactFile: this.config.micTestFile,
    };
  }

  private async inspectEndpoint(endpoint: "@DEFAULT_AUDIO_SINK@" | "@DEFAULT_AUDIO_SOURCE@"): Promise<AudioEndpointStatus> {
    if (!this.config.statusAvailable) {
      if (endpoint === "@DEFAULT_AUDIO_SINK@") {
        return this.getConfiguredFallbackEndpoint(
          this.config.playbackLabel,
          this.readMixerStatus(),
        );
      }

      return {
        available: this.config.recordAvailable,
        label: this.config.captureLabel,
        volumePercent: null,
        muted: null,
      };
    }

    try {
      const [inspectOutput, volumeOutput] = await Promise.all([
        Promise.resolve(this.run(`${this.config.statusCommand} inspect ${endpoint}`)),
        Promise.resolve(this.run(`${this.config.statusCommand} get-volume ${endpoint}`)),
      ]);

      const { volumePercent, muted } = parseVolume(volumeOutput);
      return {
        available: true,
        label:
          parseLabel(inspectOutput) ??
          (endpoint === "@DEFAULT_AUDIO_SINK@"
            ? this.config.playbackLabel
            : this.config.captureLabel),
        volumePercent,
        muted,
      };
    } catch {
      if (endpoint === "@DEFAULT_AUDIO_SINK@") {
        return this.getConfiguredFallbackEndpoint(
          this.config.playbackLabel,
          this.readMixerStatus(),
        );
      }

      return {
        available: this.config.recordAvailable,
        label: this.config.captureLabel,
        volumePercent: null,
        muted: null,
      };
    }
  }

  private getConfiguredFallbackEndpoint(
    label: string,
    volume: Pick<AudioEndpointStatus, "volumePercent" | "muted">,
  ): AudioEndpointStatus {
    return {
      available: true,
      label,
      volumePercent: volume.volumePercent,
      muted: volume.muted,
    };
  }

  private readMixerStatus(): Pick<AudioEndpointStatus, "volumePercent" | "muted"> {
    if (!this.config.mixerAvailable) {
      return { volumePercent: null, muted: null };
    }

    const cardFlag =
      this.config.mixerCardIndex == null ? "" : ` -c ${this.config.mixerCardIndex}`;

    try {
      const output = this.run(
        `${this.config.mixerCommand}${cardFlag} sget ${quoteShellArg(this.config.mixerControl)}`,
      );
      return parseAmixerVolume(output);
    } catch {
      return { volumePercent: null, muted: null };
    }
  }

  private run(command: string, timeout = this.config.commandTimeout): string {
    const fullCommand = this.config.commandPrefix
      ? `${this.config.commandPrefix} ${command}`
      : command;

    try {
      return this.deps.runCommand(fullCommand, timeout).trim();
    } catch (error) {
      const exitCode =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined;
      const message =
        error instanceof Error ? error.message : `Command failed: ${fullCommand}`;
      throw new SystemCommandError(message, fullCommand, exitCode);
    }
  }
}
