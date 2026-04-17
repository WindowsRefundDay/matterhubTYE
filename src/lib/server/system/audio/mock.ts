import type { AudioStatus, AudioTestResult } from "./types";

const MOCK_STATUS: AudioStatus = {
  supported: false,
  mode: "mock",
  backend: "mock",
  speakerTestAvailable: true,
  micTestAvailable: true,
  output: {
    available: false,
    label: "Preview mode",
    volumePercent: null,
    muted: null,
  },
  input: {
    available: false,
    label: "Preview mode",
    volumePercent: null,
    muted: null,
  },
};

export function getMockAudioStatus(): AudioStatus {
  return {
    ...MOCK_STATUS,
    output: { ...MOCK_STATUS.output },
    input: { ...MOCK_STATUS.input },
  };
}

export function runMockSpeakerTest(): AudioTestResult {
  return {
    action: "speaker_test",
    ok: true,
    mode: "mock",
    message: "Mock speaker test completed.",
    artifactFile: null,
  };
}

export function runMockMicTest(): AudioTestResult {
  return {
    action: "mic_test",
    ok: true,
    mode: "mock",
    message: "Mock microphone test completed.",
    artifactFile: null,
  };
}
