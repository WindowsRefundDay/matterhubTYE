import "server-only";

import { loadSystemConfig } from "../config";
import { AudioClient } from "./client";
import { getMockAudioStatus, runMockMicTest, runMockSpeakerTest } from "./mock";
import type { AudioAction, AudioStatus, AudioTestResult } from "./types";

export type { AudioAction, AudioStatus, AudioTestResult } from "./types";

export async function getAudioStatus(): Promise<AudioStatus> {
  const config = await loadSystemConfig();
  if (config.audio.mode === "mock") return getMockAudioStatus();
  return new AudioClient(config.audio).getStatus();
}

export async function handleAudioAction(
  action: AudioAction,
): Promise<AudioTestResult> {
  const config = await loadSystemConfig();

  if (config.audio.mode === "mock") {
    return action.action === "speaker_test"
      ? runMockSpeakerTest()
      : runMockMicTest();
  }

  const client = new AudioClient(config.audio);

  switch (action.action) {
    case "speaker_test":
      return client.runSpeakerTest();
    case "mic_test":
      return client.runMicTest();
  }
}
