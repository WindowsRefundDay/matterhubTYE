import "server-only";

import { randomUUID } from "node:crypto";
import type { VoiceEngineSessionState, VoiceEngineTurn } from "./types";

type Listener = (state: VoiceEngineSessionState) => void;

const sessions = new Map<string, VoiceEngineSessionState>();
const listeners = new Map<string, Set<Listener>>();

function nowIso(): string {
  return new Date().toISOString();
}

function cloneState(state: VoiceEngineSessionState): VoiceEngineSessionState {
  return JSON.parse(JSON.stringify(state)) as VoiceEngineSessionState;
}

function notify(sessionId: string): void {
  const state = sessions.get(sessionId);
  if (!state) return;

  const subs = listeners.get(sessionId);
  if (!subs || subs.size === 0) return;

  const snapshot = cloneState(state);
  for (const cb of subs) cb(snapshot);
}

export function createVoiceEngineSession(): VoiceEngineSessionState {
  const id = randomUUID();
  const state: VoiceEngineSessionState = {
    id,
    phase: "arming",
    active: true,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    turns: [],
    lastUserText: "",
    lastAssistantText: "",
    metrics: {
      turnCount: 0,
    },
    stopRequested: false,
  };

  sessions.set(id, state);
  notify(id);
  return cloneState(state);
}

export function getVoiceEngineSession(sessionId: string): VoiceEngineSessionState | null {
  const state = sessions.get(sessionId);
  return state ? cloneState(state) : null;
}

export function updateVoiceEngineSession(
  sessionId: string,
  update: Partial<Omit<VoiceEngineSessionState, "id" | "turns" | "metrics">> & {
    metrics?: Partial<VoiceEngineSessionState["metrics"]>;
  }
): VoiceEngineSessionState | null {
  const current = sessions.get(sessionId);
  if (!current) return null;

  const next: VoiceEngineSessionState = {
    ...current,
    ...update,
    metrics: {
      ...current.metrics,
      ...(update.metrics ?? {}),
    },
    updatedAt: nowIso(),
  };

  sessions.set(sessionId, next);
  notify(sessionId);
  return cloneState(next);
}

export function appendVoiceEngineTurn(sessionId: string, turn: VoiceEngineTurn): VoiceEngineSessionState | null {
  const current = sessions.get(sessionId);
  if (!current) return null;

  const next: VoiceEngineSessionState = {
    ...current,
    turns: [...current.turns, turn],
    lastUserText: turn.userText,
    lastAssistantText: turn.assistantText,
    metrics: {
      ...current.metrics,
      turnCount: current.metrics.turnCount + 1,
    },
    updatedAt: nowIso(),
  };

  sessions.set(sessionId, next);
  notify(sessionId);
  return cloneState(next);
}

export function stopVoiceEngineSession(sessionId: string): VoiceEngineSessionState | null {
  return updateVoiceEngineSession(sessionId, {
    stopRequested: true,
    active: false,
    phase: "stopped",
    endedAt: nowIso(),
  });
}

export function subscribeVoiceEngineSession(
  sessionId: string,
  listener: Listener
): () => void {
  let subs = listeners.get(sessionId);
  if (!subs) {
    subs = new Set<Listener>();
    listeners.set(sessionId, subs);
  }

  subs.add(listener);

  const snapshot = getVoiceEngineSession(sessionId);
  if (snapshot) {
    listener(snapshot);
  }

  return () => {
    const current = listeners.get(sessionId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(sessionId);
    }
  };
}
