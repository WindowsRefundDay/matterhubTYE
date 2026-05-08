import type { ClientDirective, ExecutedAction } from "@/lib/server/voice/tools/types";

export type VoiceEnginePhase =
  | "idle"
  | "arming"
  | "listening"
  | "processing_audio"
  | "transcribing"
  | "reasoning"
  | "executing_tools"
  | "speaking"
  | "complete"
  | "error"
  | "stopped";

export interface VoiceEngineTurn {
  id: string;
  startedAt: string;
  endedAt?: string;
  userText: string;
  assistantText: string;
  actionsExecuted: ExecutedAction[];
  clientDirectives: ClientDirective[];
  diagnostics?: Record<string, unknown>;
  error?: string;
}

export interface VoiceEngineSessionState {
  id: string;
  phase: VoiceEnginePhase;
  active: boolean;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  turns: VoiceEngineTurn[];
  lastUserText: string;
  lastAssistantText: string;
  lastError?: string;
  metrics: {
    turnCount: number;
    lastTurnDurationMs?: number;
    lastCaptureDurationMs?: number;
  };
  stopRequested: boolean;
}
