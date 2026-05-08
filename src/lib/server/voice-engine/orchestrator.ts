import "server-only";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runVoiceTextConversationTurn } from "@/lib/server/voice/executor";
import type { ClientDirective, ExecutedAction } from "@/lib/server/voice/tools/types";
import { recordFromMic, synthesizeAndSpeak } from "@/lib/server/voice/hardware-audio";
import { vlog } from "@/lib/server/voice/log";
import { loadVoiceContextFromSnapshot } from "./context";
import {
  appendVoiceEngineTurn,
  createVoiceEngineSession,
  getVoiceEngineSession,
  stopVoiceEngineSession,
  updateVoiceEngineSession,
} from "./session-store";
import { resolveSpeechToTextProvider } from "./stt/provider";
import type { VoiceEngineSessionState } from "./types";

const DEFAULT_EARCON_DIR = process.cwd();

type EarconKind = "start" | "thinking" | "complete";

const EARCON_FILES: Record<EarconKind, string> = {
  start: "VA on.wav",
  thinking: "VA thinking.wav",
  complete: "VA off.wav",
};

async function playEarcon(kind: EarconKind): Promise<void> {
  try {
    const dir = process.env.MATTERHUB_VOICE_EARCON_DIR ?? DEFAULT_EARCON_DIR;
    const filePath = path.join(dir, EARCON_FILES[kind]);
    const wav = await readFile(filePath);
    await import("@/lib/server/voice/hardware-audio").then(({ playOnSpeaker }) => playOnSpeaker(wav));
  } catch {
    // Earcons are optional; skip silently in environments without files.
  }
}

function ensureSession(sessionId: string): VoiceEngineSessionState {
  const session = getVoiceEngineSession(sessionId);
  if (!session) {
    throw new Error(`Voice session ${sessionId} not found`);
  }
  return session;
}

async function runSessionLoop(sessionId: string): Promise<void> {
  while (true) {
    const current = ensureSession(sessionId);
    if (!current.active || current.stopRequested) {
      break;
    }

    const turnId = randomUUID();
    const turnStart = Date.now();

    try {
      updateVoiceEngineSession(sessionId, { phase: "listening" });
      await playEarcon("start");

      const recording = await recordFromMic();
      updateVoiceEngineSession(sessionId, {
        phase: "processing_audio",
        metrics: { lastCaptureDurationMs: recording.durationMs },
      });

      const sttProvider = resolveSpeechToTextProvider();

      updateVoiceEngineSession(sessionId, { phase: "transcribing" });
      const sttResult = await sttProvider.transcribe(recording.wavBuffer, "audio/wav");
      const transcript = sttResult.transcript.trim();

      let assistantText = "I couldn't hear you clearly. Please try again.";
      let actionsExecuted: ExecutedAction[] = [];
      let clientDirectives: ClientDirective[] = [];

      if (transcript) {
        await playEarcon("thinking");
        updateVoiceEngineSession(sessionId, { phase: "reasoning" });
        const voiceContext = await loadVoiceContextFromSnapshot();
        const response = await runVoiceTextConversationTurn(transcript, voiceContext);

        assistantText = response.text;
        actionsExecuted = response.actionsExecuted;
        clientDirectives = response.clientDirectives;
      }

      updateVoiceEngineSession(sessionId, { phase: "speaking" });
      await synthesizeAndSpeak(assistantText);
      await playEarcon("complete");

      appendVoiceEngineTurn(sessionId, {
        id: turnId,
        startedAt: new Date(turnStart).toISOString(),
        endedAt: new Date().toISOString(),
        userText: transcript,
        assistantText,
        actionsExecuted,
        clientDirectives,
        diagnostics: {
          recordDurationMs: recording.durationMs,
          recordDiagnostics: recording.diagnostics,
          sttProvider: sttResult.provider,
          sttLatencyMs: sttResult.latencyMs,
        },
      });

      updateVoiceEngineSession(sessionId, {
        phase: "complete",
        metrics: {
          lastTurnDurationMs: Date.now() - turnStart,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vlog.error("error", `Voice engine session ${sessionId} failed: ${message}`);

      appendVoiceEngineTurn(sessionId, {
        id: turnId,
        startedAt: new Date(turnStart).toISOString(),
        endedAt: new Date().toISOString(),
        userText: "",
        assistantText: "",
        actionsExecuted: [],
        clientDirectives: [],
        error: message,
      });

      updateVoiceEngineSession(sessionId, {
        phase: "error",
        lastError: message,
        active: false,
        stopRequested: true,
      });
      break;
    }

    const afterTurn = ensureSession(sessionId);
    if (!afterTurn.active || afterTurn.stopRequested) {
      break;
    }
  }

  const final = ensureSession(sessionId);
  if (final.phase !== "error") {
    updateVoiceEngineSession(sessionId, {
      active: false,
      stopRequested: true,
      phase: "stopped",
      endedAt: new Date().toISOString(),
    });
  }
}

export function startVoiceEngineSession(): VoiceEngineSessionState {
  const session = createVoiceEngineSession();
  void runSessionLoop(session.id);
  return ensureSession(session.id);
}

export function getVoiceEngineSessionState(sessionId: string): VoiceEngineSessionState | null {
  return getVoiceEngineSession(sessionId);
}

export function requestStopVoiceEngineSession(sessionId: string): VoiceEngineSessionState | null {
  return stopVoiceEngineSession(sessionId);
}
