import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = pathToFileURL(
  path.join(rootDir, ".tmp-test", "src", "lib", "server", "voice", "hardware-audio.js")
).href;

const {
  processStereoForGemini,
  resolveHardwareAudioConfig,
  resolveSpeechThreshold,
} = await import(moduleUrl);

function buildStereoPcm(samples) {
  const buffer = Buffer.alloc(samples.length * 4);
  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(samples[i], i * 4);
    buffer.writeInt16LE(samples[i], i * 4 + 2);
  }
  return buffer;
}

test("hardware audio config reads voice tuning overrides from env", () => {
  const config = resolveHardwareAudioConfig({
    MATTERHUB_VOICE_SILENCE_RMS_THRESHOLD: "160",
    MATTERHUB_VOICE_SILENCE_DURATION_MS: "2400",
    MATTERHUB_VOICE_SPEECH_ARM_MS: "450",
    MATTERHUB_VOICE_TARGET_RMS: "6400",
    MATTERHUB_VOICE_MIN_GAIN: "3",
    MATTERHUB_VOICE_MAX_GAIN: "18",
  });

  assert.equal(config.silenceRmsThreshold, 160);
  assert.equal(config.silenceDurationMs, 2400);
  assert.equal(config.speechArmMs, 450);
  assert.equal(config.targetRms, 6400);
  assert.equal(config.minGain, 3);
  assert.equal(config.maxGain, 18);
});

test("processStereoForGemini auto-boosts very quiet mic input well beyond the old 5x ceiling", () => {
  const quietStereo = buildStereoPcm(new Array(480).fill(200));
  const { stats } = processStereoForGemini(quietStereo, {
    targetRms: 5200,
    minGain: 4,
    maxGain: 24,
  });

  assert.ok(stats.appliedGain > 5, `expected >5x gain, got ${stats.appliedGain}`);
  assert.ok(stats.outputRms > stats.inputRms * 5, "output RMS should materially increase");
  assert.equal(stats.clippedSamples, 0);
});

test("processStereoForGemini respects peak headroom instead of blindly clipping loud speech", () => {
  const loudStereo = buildStereoPcm(new Array(480).fill(28000));
  const { stats } = processStereoForGemini(loudStereo, {
    targetRms: 5200,
    minGain: 4,
    maxGain: 24,
  });

  assert.ok(stats.appliedGain >= 4, `expected louder gain, got ${stats.appliedGain}`);
  assert.ok(stats.outputPeak <= 32767);
  assert.ok(stats.clippedRatio <= 0.01);
});

test("resolveSpeechThreshold keeps a lower floor for quiet rooms and scales up for noisy rooms", () => {
  assert.equal(resolveSpeechThreshold(80, 180), 180);
  assert.ok(resolveSpeechThreshold(260, 180) > 300);
});
