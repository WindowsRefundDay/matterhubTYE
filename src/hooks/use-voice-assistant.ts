"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSmartHomeActions } from "./use-smart-home";
import type { Screen } from "@/types";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface UseVoiceAssistantReturn {
  voiceState: VoiceState;
  isSessionOpen: boolean;
  turns: ConversationTurn[];
  currentResponse: string;
  currentImage: { url: string; caption?: string } | null;
  micError: string | null;
  startSession: () => void;
  dismissSession: () => void;
}

const SESSION_INACTIVITY_MS = 15000;

type EnginePhase =
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

interface EngineTurn {
  userText: string;
  assistantText: string;
  startedAt: string;
}

interface EngineSession {
  id: string;
  phase: EnginePhase;
  turns: EngineTurn[];
  lastError?: string;
}

function phaseToVoiceState(phase: EnginePhase): VoiceState {
  if (phase === "listening") return "listening";
  if (phase === "speaking") return "speaking";
  if (
    phase === "processing_audio" ||
    phase === "transcribing" ||
    phase === "reasoning" ||
    phase === "executing_tools"
  ) {
    return "thinking";
  }
  return "idle";
}

/**
 * Voice assistant hook — session-driven engine mode.
 *
 * The backend voice engine owns microphone capture, STT, intent reasoning,
 * tool execution, earcons, and playback. The browser only starts/stops a
 * session and renders stream updates.
 */
export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const { setScreen, goHome } = useSmartHomeActions();

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [currentImage, setCurrentImage] = useState<{ url: string; caption?: string } | null>(
    null
  );
  const [micError, setMicError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionOpenRef = useRef(false);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const armSessionTimer = useCallback(() => {
    clearSessionTimer();
    sessionTimerRef.current = setTimeout(() => {
      if (!sessionOpenRef.current) return;
      goHome();
      sessionOpenRef.current = false;
      setIsSessionOpen(false);
      setVoiceState("idle");
    }, SESSION_INACTIVITY_MS);
  }, [clearSessionTimer, goHome]);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const closeSession = useCallback(
    async (returnHome: boolean) => {
      const sessionId = sessionIdRef.current;
      sessionOpenRef.current = false;
      setIsSessionOpen(false);
      clearSessionTimer();
      closeStream();

      if (sessionId) {
        void fetch(`/api/voice/session/${sessionId}/stop`, {
          method: "POST",
        }).catch(() => {});
      }

      sessionIdRef.current = null;
      setVoiceState("idle");
      setCurrentImage(null);

      if (returnHome) {
        goHome();
      }
    },
    [clearSessionTimer, closeStream, goHome]
  );

  const consumeSessionState = useCallback(
    (session: EngineSession) => {
      setVoiceState(phaseToVoiceState(session.phase));

      if (session.lastError) {
        setMicError(session.lastError);
      }

      const renderedTurns: ConversationTurn[] = [];
      for (const turn of session.turns) {
        const ts = Date.parse(turn.startedAt) || Date.now();
        if (turn.userText.trim()) {
          renderedTurns.push({ role: "user", text: turn.userText, timestamp: ts });
        }
        if (turn.assistantText.trim()) {
          renderedTurns.push({ role: "assistant", text: turn.assistantText, timestamp: ts + 1 });
        }
      }
      setTurns(renderedTurns);

      const latestAssistant = [...session.turns]
        .reverse()
        .find((turn) => turn.assistantText.trim())
        ?.assistantText;
      setCurrentResponse(latestAssistant ?? "");

      if (session.phase === "stopped" || session.phase === "error") {
        armSessionTimer();
      }
    },
    [armSessionTimer]
  );

  const openEventStream = useCallback(
    (sessionId: string) => {
      closeStream();
      const source = new EventSource(`/api/voice/session/${sessionId}/events`);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        if (!sessionOpenRef.current) return;

        try {
          const payload = JSON.parse(event.data) as {
            status: string;
            session?: EngineSession;
          };

          if (payload.status === "ok" && payload.session) {
            consumeSessionState(payload.session);
          }
        } catch {
          // Ignore malformed chunks.
        }
      };

      source.onerror = () => {
        if (!sessionOpenRef.current) return;
        setMicError("Voice stream disconnected");
      };
    },
    [closeStream, consumeSessionState]
  );

  const startSession = useCallback(async () => {
    if (sessionOpenRef.current) return;

    sessionOpenRef.current = true;
    setIsSessionOpen(true);
    setMicError(null);
    setCurrentImage(null);
    setCurrentResponse("");
    setTurns([]);

    try {
      const res = await fetch("/api/voice/session", {
        method: "POST",
      });
      const payload = (await res.json()) as {
        status: string;
        session?: EngineSession;
        error?: string;
      };

      if (!res.ok || payload.status !== "ok" || !payload.session) {
        throw new Error(payload.error ?? `Voice session start failed (${res.status})`);
      }

      sessionIdRef.current = payload.session.id;
      consumeSessionState(payload.session);
      openEventStream(payload.session.id);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMicError(msg);
      void closeSession(false);
    }
  }, [closeSession, consumeSessionState, openEventStream]);

  const dismissSession = useCallback(() => {
    void closeSession(false);
  }, [closeSession]);

  // Keep existing directive behavior hook-ready for future engine directives.
  useEffect(() => {
    if (!currentImage) return;
    if (currentImage.url.includes("screen:")) {
      const target = currentImage.url.replace("screen:", "") as Screen;
      setScreen(target);
    }
  }, [currentImage, setScreen]);

  useEffect(() => {
    return () => {
      clearSessionTimer();
      closeStream();
    };
  }, [clearSessionTimer, closeStream]);

  return {
    voiceState,
    isSessionOpen,
    turns,
    currentResponse,
    currentImage,
    micError,
    startSession,
    dismissSession,
  };
}
