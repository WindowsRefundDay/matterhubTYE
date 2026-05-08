import "server-only";

import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { vlog } from "./log";

const NATIVE_SAMPLE_RATE = 48000;
const NATIVE_CHANNELS = 2;
const RECORD_FORMAT = "S16_LE";
const MAX_RECORD_SECONDS = 8;
const DEFAULT_SILENCE_RMS_THRESHOLD = 240;
const DEFAULT_SILENCE_DURATION_MS = 1800;
const DEFAULT_SPEECH_ARM_MS = 300;
const DEFAULT_TARGET_RMS = 7000;
const DEFAULT_MIN_GAIN = 4;
const DEFAULT_MAX_GAIN = 40;
const MAX_INT16 = 32767;
const MIN_INT16 = -32768;
const SOFT_LIMIT_START = 28000;
const SOFT_LIMIT_RATIO = 0.05;
const NOISE_FLOOR_MARGIN = 70;
const NOISE_FLOOR_SCALE = 1.35;

const CAPTURE_DEVICE = process.env.MATTERHUB_VOICE_CAPTURE_DEVICE
  || process.env.MATTERHUB_AUDIO_CAPTURE_DEVICE
  || "plughw:1,0";
const PLAYBACK_DEVICE = process.env.MATTERHUB_VOICE_PLAYBACK_DEVICE
  || "plughw:1,0";

const DEFAULT_PIPER_BINARY = "/home/matter/.venv/bin/piper";
const DEFAULT_PIPER_MODEL =
  "/home/matter/piper-models/en_US-amy-medium.onnx";

export interface HardwareAudioConfig {
  silenceRmsThreshold: number;
  silenceDurationMs: number;
  speechArmMs: number;
  targetRms: number;
  minGain: number;
  maxGain: number;
}

export interface GeminiPcmStats {
  inputRms: number;
  inputPeak: number;
  outputRms: number;
  outputPeak: number;
  appliedGain: number;
  clippedSamples: number;
  totalSamples: number;
  clippedRatio: number;
}

export interface RecordingDiagnostics extends GeminiPcmStats {
  rawBytes: number;
  processedBytes: number;
  noiseFloorRms: number;
  speechThreshold: number;
  maxChunkRms: number;
  speechDetected: boolean;
  silenceTriggered: boolean;
  silenceTriggeredAtMs: number | null;
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveHardwareAudioConfig(
  env: NodeJS.ProcessEnv = process.env
): HardwareAudioConfig {
  return {
    silenceRmsThreshold: readPositiveNumber(
      env.MATTERHUB_VOICE_SILENCE_RMS_THRESHOLD,
      DEFAULT_SILENCE_RMS_THRESHOLD
    ),
    silenceDurationMs: readPositiveNumber(
      env.MATTERHUB_VOICE_SILENCE_DURATION_MS,
      DEFAULT_SILENCE_DURATION_MS
    ),
    speechArmMs: readPositiveNumber(
      env.MATTERHUB_VOICE_SPEECH_ARM_MS,
      DEFAULT_SPEECH_ARM_MS
    ),
    targetRms: readPositiveNumber(
      env.MATTERHUB_VOICE_TARGET_RMS,
      DEFAULT_TARGET_RMS
    ),
    minGain: readPositiveNumber(
      env.MATTERHUB_VOICE_MIN_GAIN,
      DEFAULT_MIN_GAIN
    ),
    maxGain: readPositiveNumber(
      env.MATTERHUB_VOICE_MAX_GAIN,
      DEFAULT_MAX_GAIN
    ),
  };
}

function buildWavHeader(
  pcmByteLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcmByteLength, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcmByteLength, 40);
  return header;
}

function computeRms(pcm: Buffer): number {
  const samples = pcm.length / 2;
  if (samples === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pcm.length - 1; i += 2) {
    const s = pcm.readInt16LE(i);
    sum += s * s;
  }
  return Math.sqrt(sum / samples);
}

function computeMonoSignalStats(pcm: Buffer): { rms: number; peak: number } {
  const samples = pcm.length / 2;
  if (samples === 0) {
    return { rms: 0, peak: 0 };
  }

  let sum = 0;
  let peak = 0;

  for (let i = 0; i < pcm.length - 1; i += 2) {
    const sample = pcm.readInt16LE(i);
    const abs = Math.abs(sample);
    sum += sample * sample;
    if (abs > peak) peak = abs;
  }

  return {
    rms: Math.sqrt(sum / samples),
    peak,
  };
}

export function resolveSpeechThreshold(
  noiseFloorRms: number,
  configuredThreshold: number
): number {
  const adaptiveThreshold = Math.max(
    noiseFloorRms * NOISE_FLOOR_SCALE,
    noiseFloorRms + NOISE_FLOOR_MARGIN
  );

  return Math.max(configuredThreshold, Math.round(adaptiveThreshold));
}

export function processStereoForGemini(
  stereoPcm: Buffer,
  config: Pick<HardwareAudioConfig, "targetRms" | "minGain" | "maxGain">
): { pcm: Buffer; stats: GeminiPcmStats } {
  const sampleCount = stereoPcm.length / 4;
  const monoPcm = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i += 1) {
    monoPcm.writeInt16LE(stereoPcm.readInt16LE(i * 4), i * 2);
  }

  const inputStats = computeMonoSignalStats(monoPcm);
  const minGain = Math.min(config.minGain, config.maxGain);
  const gainFromTarget = inputStats.rms > 0
    ? config.targetRms / inputStats.rms
    : config.maxGain;
  const unclampedGain = Math.max(minGain, gainFromTarget);
  const appliedGain = Math.max(1, Math.min(config.maxGain, unclampedGain));

  let clippedSamples = 0;
  const boostedPcm = Buffer.alloc(monoPcm.length);

  for (let i = 0; i < sampleCount; i += 1) {
    let sample = Math.round(monoPcm.readInt16LE(i * 2) * appliedGain);
    const sign = Math.sign(sample) || 1;
    const absSample = Math.abs(sample);

    if (absSample > SOFT_LIMIT_START) {
      const compressed = SOFT_LIMIT_START + (absSample - SOFT_LIMIT_START) * SOFT_LIMIT_RATIO;
      sample = Math.round(sign * compressed);
    }

    if (sample > MAX_INT16) {
      sample = MAX_INT16;
      clippedSamples += 1;
    } else if (sample < MIN_INT16) {
      sample = MIN_INT16;
      clippedSamples += 1;
    }

    boostedPcm.writeInt16LE(sample, i * 2);
  }

  const outputStats = computeMonoSignalStats(boostedPcm);
  const totalSamples = Math.max(sampleCount, 1);

  return {
    pcm: boostedPcm,
    stats: {
      inputRms: inputStats.rms,
      inputPeak: inputStats.peak,
      outputRms: outputStats.rms,
      outputPeak: outputStats.peak,
      appliedGain,
      clippedSamples,
      totalSamples,
      clippedRatio: clippedSamples / totalSamples,
    },
  };
}

export async function recordFromMic(): Promise<{
  wavBuffer: Buffer;
  durationMs: number;
  diagnostics: RecordingDiagnostics;
}> {
  const config = resolveHardwareAudioConfig();
  const args = [
    "-D", CAPTURE_DEVICE,
    "-f", RECORD_FORMAT,
    "-r", String(NATIVE_SAMPLE_RATE),
    "-c", String(NATIVE_CHANNELS),
    "-t", "raw",
    "-d", String(MAX_RECORD_SECONDS),
  ];

  vlog.info("audio", `Recording from ${CAPTURE_DEVICE}`, {
    nativeRate: NATIVE_SAMPLE_RATE,
    nativeChannels: NATIVE_CHANNELS,
    maxSeconds: MAX_RECORD_SECONDS,
    silenceThresholdFloor: config.silenceRmsThreshold,
    silenceDurationMs: config.silenceDurationMs,
    targetRms: config.targetRms,
    minGain: config.minGain,
    maxGain: config.maxGain,
  });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const startTime = Date.now();
    let silenceSince: number | null = null;
    let silenceTriggeredAtMs: number | null = null;
    let speechDetected = false;
    let killed = false;
    let maxChunkRms = 0;
    const preSpeechRms: number[] = [];

    const proc = spawn("arecord", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);

      const elapsed = Date.now() - startTime;
      const rms = computeRms(chunk);
      const threshold = resolveSpeechThreshold(
        preSpeechRms.length > 0
          ? preSpeechRms.reduce((sum, value) => sum + value, 0) / preSpeechRms.length
          : 0,
        config.silenceRmsThreshold
      );

      if (rms > maxChunkRms) {
        maxChunkRms = rms;
      }

      if (elapsed < config.speechArmMs) {
        return;
      }

      if (rms > threshold) {
        speechDetected = true;
        silenceSince = null;
        return;
      }

      if (!speechDetected) {
        preSpeechRms.push(rms);
        if (preSpeechRms.length > 12) {
          preSpeechRms.shift();
        }
        return;
      }

      if (silenceSince === null) {
        silenceSince = Date.now();
      } else if (Date.now() - silenceSince >= config.silenceDurationMs) {
        if (!killed) {
          killed = true;
          silenceTriggeredAtMs = elapsed;
          vlog.info("audio", `Silence after speech at ${elapsed}ms, stopping`, {
            threshold,
            rms,
          });
          proc.kill("SIGTERM");
        }
      }
    });

    proc.stderr.on("data", () => {});

    proc.on("close", () => {
      const rawPcm = Buffer.concat(chunks);
      const durationMs = Date.now() - startTime;
      const noiseFloorRms = preSpeechRms.length > 0
        ? preSpeechRms.reduce((sum, value) => sum + value, 0) / preSpeechRms.length
        : 0;
      const speechThreshold = resolveSpeechThreshold(
        noiseFloorRms,
        config.silenceRmsThreshold
      );

      vlog.info("audio", "Recording complete", {
        durationMs,
        rawBytes: rawPcm.length,
        speechDetected,
        noiseFloorRms,
        speechThreshold,
        maxChunkRms,
      });

      if (rawPcm.length === 0) {
        reject(new Error("No audio captured from microphone"));
        return;
      }

      const processed = processStereoForGemini(rawPcm, config);
      const wav = Buffer.concat([
        buildWavHeader(processed.pcm.length, NATIVE_SAMPLE_RATE, 1),
        processed.pcm,
      ]);

      const diagnostics: RecordingDiagnostics = {
        rawBytes: rawPcm.length,
        processedBytes: processed.pcm.length,
        noiseFloorRms,
        speechThreshold,
        maxChunkRms,
        speechDetected,
        silenceTriggered: silenceTriggeredAtMs !== null,
        silenceTriggeredAtMs,
        ...processed.stats,
      };

      vlog.info("audio", "Processed audio for Gemini", {
        rawBytes: diagnostics.rawBytes,
        processedBytes: diagnostics.processedBytes,
        inputRms: Number(diagnostics.inputRms.toFixed(1)),
        outputRms: Number(diagnostics.outputRms.toFixed(1)),
        inputPeak: diagnostics.inputPeak,
        outputPeak: diagnostics.outputPeak,
        appliedGain: Number(diagnostics.appliedGain.toFixed(2)),
        clippedRatio: Number((diagnostics.clippedRatio * 100).toFixed(2)),
        noiseFloorRms: Number(diagnostics.noiseFloorRms.toFixed(1)),
        speechThreshold: diagnostics.speechThreshold,
        maxChunkRms: Number(diagnostics.maxChunkRms.toFixed(1)),
        speechDetected: diagnostics.speechDetected,
        silenceTriggeredAtMs: diagnostics.silenceTriggeredAtMs,
      });

      resolve({ wavBuffer: wav, durationMs, diagnostics });
    });

    proc.on("error", (err) => {
      reject(new Error(`arecord failed: ${err.message}`));
    });
  });
}

export async function playOnSpeaker(wavBuffer: Buffer): Promise<void> {
  const device = PLAYBACK_DEVICE;

  vlog.info("audio", `Playing ${wavBuffer.length} bytes on ${device}`);

  return new Promise((resolve) => {
    const proc = spawn("aplay", ["-D", device, "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdin.write(wavBuffer);
    proc.stdin.end();

    proc.stderr.on("data", () => {});

    proc.on("close", (code) => {
      if (code === 0) {
        vlog.info("audio", "Playback complete");
        resolve();
      } else {
        vlog.warn("audio", `aplay exited with code ${code}`);
        resolve();
      }
    });

    proc.on("error", (err) => {
      vlog.warn("audio", `aplay failed: ${err.message}`);
      resolve();
    });
  });
}

export async function synthesizeAndSpeak(text: string): Promise<Buffer> {
  const piperBin = process.env.PIPER_BINARY_PATH ?? DEFAULT_PIPER_BINARY;
  const modelPath = process.env.PIPER_MODEL_PATH ?? DEFAULT_PIPER_MODEL;

  if (!existsSync(piperBin)) {
    vlog.warn("tts", `Piper binary not found at ${piperBin}, skipping TTS`);
    return Buffer.alloc(0);
  }

  vlog.info("tts", `Synthesizing: "${text.slice(0, 80)}..."`, { piperBin, modelPath });

  const pcmChunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    const piper = spawn(piperBin, ["--model", modelPath, "--output_raw"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    piper.stdin.write(text.trim());
    piper.stdin.end();

    piper.stdout.on("data", (chunk: Buffer) => pcmChunks.push(chunk));
    piper.stderr.on("data", () => {});

    piper.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Piper exited with code ${code}`));
    });

    piper.on("error", reject);
  });

  const pcm = Buffer.concat(pcmChunks);
  const wav = Buffer.concat([buildWavHeader(pcm.length, 22050, 1), pcm]);

  vlog.info("tts", `Synthesized ${wav.length} bytes, playing on speaker`);

  await playOnSpeaker(wav);

  return wav;
}

export function isHardwareAudioAvailable(): boolean {
  try {
    execSync("which arecord", { encoding: "utf8", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
