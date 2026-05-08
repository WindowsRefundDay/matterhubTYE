import "server-only";

import { transcribeAudioWithGemini } from "@/lib/server/voice/executor";

export interface SpeechToTextResult {
  transcript: string;
  provider: string;
  latencyMs: number;
}

export interface SpeechToTextProvider {
  transcribe(wavBuffer: Buffer, mimeType: string): Promise<SpeechToTextResult>;
}

class GeminiSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(wavBuffer: Buffer, mimeType: string): Promise<SpeechToTextResult> {
    const started = Date.now();
    const transcript = await transcribeAudioWithGemini(
      wavBuffer.toString("base64"),
      mimeType
    );

    return {
      transcript,
      provider: "gemini-audio-transcribe",
      latencyMs: Date.now() - started,
    };
  }
}

export function resolveSpeechToTextProvider(): SpeechToTextProvider {
  // First provider for rewrite: explicit adapter layer.
  // Additional OS-local providers can be plugged in without changing orchestration.
  return new GeminiSpeechToTextProvider();
}
