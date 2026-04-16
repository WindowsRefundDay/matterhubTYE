import "server-only";

export type VoiceLogLevel = "info" | "warn" | "error";
export type VoiceLogPhase =
  | "session"
  | "audio"
  | "gemini"
  | "tool"
  | "tts"
  | "directive"
  | "error";

export function voiceLog(
  level: VoiceLogLevel,
  phase: VoiceLogPhase,
  msg: string,
  data?: Record<string, unknown>
): void {
  const tag = `[voice:${phase}]`;
  const line = data
    ? `${tag} ${msg} ${JSON.stringify(data)}`
    : `${tag} ${msg}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const vlog = {
  info:  (phase: VoiceLogPhase, msg: string, data?: Record<string, unknown>) => voiceLog("info",  phase, msg, data),
  warn:  (phase: VoiceLogPhase, msg: string, data?: Record<string, unknown>) => voiceLog("warn",  phase, msg, data),
  error: (phase: VoiceLogPhase, msg: string, data?: Record<string, unknown>) => voiceLog("error", phase, msg, data),
};
