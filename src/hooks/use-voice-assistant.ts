"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSmartHomeActions } from "./use-smart-home";
import type { ClientDirective } from "@/lib/server/voice/tools/types";
import type { VoiceContext } from "@/lib/server/voice/executor";
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

interface UseVoiceAssistantOptions {
  context: VoiceContext;
}

const SILENCE_THRESHOLD = 0.01;
const SILENCE_ARM_MS = 500;
const SILENCE_TRIGGER_MS = 1500;
const SILENCE_POLL_MS = 100;
const SESSION_INACTIVITY_MS = 10000;
const THINKING_FADE_MS = 220;
const ENABLE_TEMP_MIC_LOGGING = true;

const VOICE_SFX = {
  on: "/audio/voice/va-on.wav",
  off: "/audio/voice/va-off.wav",
  thinking: "/audio/voice/va-thinking.wav",
} as const;

const VOICE_SFX_VOLUME = {
  on: 0.55,
  off: 0.5,
  thinking: 0.22,
} as const;

async function buildMicErrorMessage(error: unknown): Promise<string> {
  const base =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : `Unknown mic error: ${String(error)}`;

  const diagnostics: string[] = [];

  diagnostics.push(`secure=${window.isSecureContext ? "yes" : "no"}`);
  diagnostics.push(
    `mediaDevices=${typeof navigator.mediaDevices?.getUserMedia === "function" ? "yes" : "no"}`
  );

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((device) => device.kind === "audioinput");
    diagnostics.push(`audioInputs=${inputs.length}`);
    if (inputs[0]?.label) {
      diagnostics.push(`firstInput=${inputs[0].label}`);
    }
  } catch {
    diagnostics.push("audioInputs=unknown");
  }

  return `${base} [${diagnostics.join(" | ")}]`;
}

async function postTempMicLog(
  event: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (!ENABLE_TEMP_MIC_LOGGING) return;

  try {
    await fetch("/api/system/audio-test-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, details }),
    });
  } catch {
    // best effort
  }
}

function isCoherentSpeech(text?: string): boolean {
  if (!text) return false;
  const normalized = text.trim();
  if (normalized.length < 8) return false;
  const words = normalized.match(/[a-z0-9']+/gi) ?? [];
  return words.length >= 2;
}

export function useVoiceAssistant({
  context,
}: UseVoiceAssistantOptions): UseVoiceAssistantReturn {
  const { setScreen, goHome } = useSmartHomeActions();

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [currentImage, setCurrentImage] = useState<{ url: string; caption?: string } | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const stateRef = useRef<VoiceState>("idle");
  const sessionOpenRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silencePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceArmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const oneShotSfxRef = useRef<HTMLAudioElement | null>(null);
  const thinkingSfxRef = useRef<HTMLAudioElement | null>(null);
  const thinkingFadeRafRef = useRef<number | null>(null);

  const cancelThinkingFade = useCallback(() => {
    if (thinkingFadeRafRef.current == null) return;
    window.cancelAnimationFrame(thinkingFadeRafRef.current);
    thinkingFadeRafRef.current = null;
  }, []);

  const stopThinkingLoopSfx = useCallback(
    (resetVolume = true) => {
      cancelThinkingFade();
      const audio = thinkingSfxRef.current;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      if (resetVolume) {
        audio.volume = VOICE_SFX_VOLUME.thinking;
      }
    },
    [cancelThinkingFade]
  );

  const startThinkingLoopSfx = useCallback(() => {
    cancelThinkingFade();
    let audio = thinkingSfxRef.current;
    if (!audio) {
      audio = new Audio(VOICE_SFX.thinking);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = VOICE_SFX_VOLUME.thinking;
      thinkingSfxRef.current = audio;
    } else {
      audio.volume = VOICE_SFX_VOLUME.thinking;
    }

    if (audio.paused) {
      void audio.play().catch(() => undefined);
    }
  }, [cancelThinkingFade]);

  const fadeOutThinkingLoopSfx = useCallback(() => {
    const audio = thinkingSfxRef.current;
    if (!audio || audio.paused) return;
    if (thinkingFadeRafRef.current != null) return;

    const startVolume = audio.volume;
    const startedAt = performance.now();

    const step = (time: number) => {
      const progress = Math.min((time - startedAt) / THINKING_FADE_MS, 1);
      audio.volume = Math.max(0, startVolume * (1 - progress));

      if (progress < 1) {
        thinkingFadeRafRef.current = window.requestAnimationFrame(step);
        return;
      }

      thinkingFadeRafRef.current = null;
      stopThinkingLoopSfx();
    };

    thinkingFadeRafRef.current = window.requestAnimationFrame(step);
  }, [stopThinkingLoopSfx]);

  const playOneShotSfx = useCallback((url: string, volume: number) => {
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.volume = volume;
    oneShotSfxRef.current = audio;
    void audio.play().catch(() => undefined);
  }, []);

  const transition = useCallback(
    (next: VoiceState) => {
      stateRef.current = next;
      setVoiceState(next);

      if (next === "thinking") {
        startThinkingLoopSfx();
        return;
      }

      if (next === "speaking") {
        fadeOutThinkingLoopSfx();
        return;
      }

      stopThinkingLoopSfx();
    },
    [fadeOutThinkingLoopSfx, startThinkingLoopSfx, stopThinkingLoopSfx]
  );

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const closeSession = useCallback(
    (returnHome: boolean, playOffSfx = true) => {
      const wasOpen = sessionOpenRef.current;
      sessionOpenRef.current = false;
      setIsSessionOpen(false);
      clearSessionTimer();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      transition("idle");
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (silencePollRef.current) {
        clearInterval(silencePollRef.current);
        silencePollRef.current = null;
      }
      if (silenceArmTimerRef.current) {
        clearTimeout(silenceArmTimerRef.current);
        silenceArmTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      mediaRecorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      setCurrentImage(null);
      setCurrentResponse("");
      setMicError(null);
      stopThinkingLoopSfx();

      if (returnHome) {
        goHome();
      }

      if (playOffSfx && wasOpen) {
        playOneShotSfx(VOICE_SFX.off, VOICE_SFX_VOLUME.off);
      }
    },
    [clearSessionTimer, goHome, playOneShotSfx, stopThinkingLoopSfx, transition]
  );

  const armSessionTimer = useCallback(() => {
    clearSessionTimer();
    sessionTimerRef.current = setTimeout(() => {
      if (!sessionOpenRef.current) return;
      closeSession(true);
    }, SESSION_INACTIVITY_MS);
  }, [clearSessionTimer, closeSession]);

  const cleanupSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silencePollRef.current) {
      clearInterval(silencePollRef.current);
      silencePollRef.current = null;
    }
    if (silenceArmTimerRef.current) {
      clearTimeout(silenceArmTimerRef.current);
      silenceArmTimerRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    cleanupSilenceDetection();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (oneShotSfxRef.current) {
      oneShotSfxRef.current.pause();
      oneShotSfxRef.current = null;
    }

    stopThinkingLoopSfx();
    chunksRef.current = [];
  }, [cleanupSilenceDetection, stopThinkingLoopSfx]);

  const dismissSession = useCallback(() => {
    closeSession(false);
  }, [closeSession]);

  const applyClientDirectives = useCallback(
    (directives: ClientDirective[]) => {
      for (const directive of directives) {
        if (directive.kind === "navigate_to_screen") {
          setScreen(directive.screen as Screen);
        }
        if (directive.kind === "show_image") {
          setCurrentImage({ url: directive.url, caption: directive.caption });
        }
      }
    },
    [setScreen]
  );

  const speakText = useCallback(
    async (text: string) => {
      transition("speaking");
      setCurrentResponse(text);

      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error("TTS fetch failed");

        const contentType = res.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          await new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.92;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            window.speechSynthesis.speak(utterance);
          });
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        await new Promise<void>(async (resolve) => {
          const audio = new Audio(url);
          audioElementRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            objectUrlRef.current = null;
            resolve();
          };
          audio.onerror = () => resolve();
          try {
            await audio.play();
          } catch {
            resolve();
          }
        });
      } catch {
        // best effort
      }
    },
    [transition]
  );

  const stopRecording = useCallback(() => {
    cleanupSilenceDetection();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }, [cleanupSilenceDetection]);

  const armSilenceDetection = useCallback(
    (requireSpeechStart: boolean) => {
      const analyser = analyserRef.current;
      if (!analyser) return;

      const buffer = new Float32Array(analyser.fftSize);
      let armed = false;
      let speechDetected = !requireSpeechStart;

      silenceArmTimerRef.current = setTimeout(() => {
        armed = true;
      }, SILENCE_ARM_MS);

      silencePollRef.current = setInterval(() => {
        if (!armed || !sessionOpenRef.current) return;

        analyser.getFloatTimeDomainData(buffer);
        const rms = Math.sqrt(
          buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length
        );

        if (rms >= SILENCE_THRESHOLD) {
          speechDetected = true;
          clearSessionTimer();
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          return;
        }

        if (!speechDetected || silenceTimerRef.current) return;

        silenceTimerRef.current = setTimeout(() => {
          if (stateRef.current === "listening") {
            transition("thinking");
            stopRecording();
          }
        }, SILENCE_TRIGGER_MS);
      }, SILENCE_POLL_MS);
    },
    [clearSessionTimer, stopRecording, transition]
  );

  const beginListening = useCallback(
    async (requireSpeechStart: boolean) => {
      if (!sessionOpenRef.current || stateRef.current !== "idle") return;

      try {
        await postTempMicLog("voice_mic_request_started", {
          requireSpeechStart,
          secureContext: window.isSecureContext,
          hasGetUserMedia:
            typeof navigator.mediaDevices?.getUserMedia === "function",
        });

        try {
          await postTempMicLog("voice_mic_devices_started");
          const devices = await navigator.mediaDevices.enumerateDevices();
          const inputs = devices
            .filter((device) => device.kind === "audioinput")
            .map((device) => ({
              deviceId: device.deviceId,
              label: device.label || "(blank)",
              groupId: device.groupId || "(blank)",
            }));
          await postTempMicLog("voice_mic_devices", {
            audioInputs: inputs,
          });
        } catch (error) {
          await postTempMicLog("voice_mic_devices_failed", {
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          });
        }

        await postTempMicLog("voice_mic_gum_started");
        const gumTimeout = window.setTimeout(() => {
          void postTempMicLog("voice_mic_gum_timeout", {
            afterMs: 8000,
          });
        }, 8000);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.clearTimeout(gumTimeout);
        streamRef.current = stream;
        setMicError(null);
        await postTempMicLog("voice_mic_stream_opened", {
          trackLabels: stream.getAudioTracks().map((track) => track.label || "(blank)"),
          trackCount: stream.getAudioTracks().length,
        });

        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        await postTempMicLog("voice_mic_recorder_ready", {
          mimeType: recorder.mimeType || "(default)",
        });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          chunksRef.current = [];

          if (stateRef.current === "thinking" && sessionOpenRef.current) {
            void (async () => {
              try {
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });

                const res = await fetch("/api/voice/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    audio: base64,
                    mimeType: blob.type || "audio/webm",
                    context,
                  }),
                });

                if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

                const data = (await res.json()) as {
                  status: string;
                  text: string;
                  userText?: string;
                  actionsExecuted: unknown[];
                  clientDirectives: ClientDirective[];
                  error?: string;
                };

                if (data.status !== "ok") throw new Error(data.error ?? "Unknown error");

                const coherent = isCoherentSpeech(data.userText);
                if (!coherent) {
                  closeSession(true);
                  return;
                }

                applyClientDirectives(data.clientDirectives ?? []);

                setTurns((prev) => {
                  const nextTurns = [...prev];
                  nextTurns.push({
                    role: "user",
                    text: data.userText!.trim(),
                    timestamp: Date.now(),
                  });
                  nextTurns.push({
                    role: "assistant",
                    text: data.text,
                    timestamp: Date.now() + 1,
                  });
                  return nextTurns;
                });

                await speakText(data.text);

                if (!sessionOpenRef.current) return;
                transition("idle");
                armSessionTimer();
                void beginListening(true);
              } catch {
                if (!sessionOpenRef.current) return;
                closeSession(true);
              }
            })();
          }
        };

        recorder.start(100);
        transition("listening");
        armSilenceDetection(requireSpeechStart);
      } catch (error) {
        const message = await buildMicErrorMessage(error);
        setMicError(message);
        await postTempMicLog("voice_mic_failed", {
          message,
        });
        transition("idle");
        armSessionTimer();
      }
    },
    [applyClientDirectives, armSessionTimer, armSilenceDetection, closeSession, context, speakText, transition]
  );

  const startSession = useCallback(() => {
    if (sessionOpenRef.current) return;

    sessionOpenRef.current = true;
    setIsSessionOpen(true);
    setCurrentImage(null);
    setCurrentResponse("");
    setTurns([]);
    setMicError(null);
    transition("idle");
    playOneShotSfx(VOICE_SFX.on, VOICE_SFX_VOLUME.on);
    armSessionTimer();
    void beginListening(true);
  }, [armSessionTimer, beginListening, playOneShotSfx, transition]);

  useEffect(() => {
    return () => {
      clearSessionTimer();
      cleanupAudio();
    };
  }, [clearSessionTimer, cleanupAudio]);

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
