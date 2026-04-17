export interface AudioEndpointStatus {
  available: boolean;
  label: string | null;
  volumePercent: number | null;
  muted: boolean | null;
}

export interface AudioStatus {
  supported: boolean;
  mode: "hardware" | "mock";
  backend: "pipewire" | "unknown" | "mock";
  speakerTestAvailable: boolean;
  micTestAvailable: boolean;
  output: AudioEndpointStatus;
  input: AudioEndpointStatus;
}

export interface AudioTestResult {
  action: "speaker_test" | "mic_test";
  ok: boolean;
  mode: "hardware" | "mock";
  message: string;
  artifactFile: string | null;
}

export type AudioAction =
  | { action: "speaker_test" }
  | { action: "mic_test" };
