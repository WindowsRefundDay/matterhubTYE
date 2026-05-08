import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { runVoiceConversationTurn } from "@/lib/server/voice/executor";
import { recordFromMic, synthesizeAndSpeak } from "@/lib/server/voice/hardware-audio";
import { vlog } from "@/lib/server/voice/log";
import type { VoiceContext } from "@/lib/server/voice/executor";

/**
 * POST /api/voice/turn
 *
 * Handles a complete voice conversation turn using OS-level audio:
 *   1. Records from the hardware mic (arecord) with silence detection
 *   2. Sends the audio to Gemini for processing + tool execution
 *   3. Synthesizes the response via Piper and plays on the Pi speaker (aplay)
 *   4. Returns the transcript and directives to the browser for UI display
 *
 * The browser is a control surface only — no mic or speaker access needed.
 */
export async function POST(request: NextRequest) {
  const turnStart = Date.now();

  try {
    const body = (await request.json()) as {
      context?: VoiceContext;
    };

    const context = body.context ?? { devices: [], rooms: [], scenes: [] };

    // Step 1: Record from hardware mic
    vlog.info("session", "OS-level turn started — recording from hardware mic");
    let wavBuffer: Buffer;
    let recordDurationMs: number;
    let recordDiagnostics: unknown;

    try {
      const result = await recordFromMic();
      wavBuffer = result.wavBuffer;
      recordDurationMs = result.durationMs;
      recordDiagnostics = result.diagnostics;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      vlog.error("error", `Recording failed: ${msg}`);
      return NextResponse.json(
        { status: "error", error: `Mic recording failed: ${msg}` },
        { status: 500 }
      );
    }

    // Step 2: Send to Gemini
    vlog.info("session", `Recorded ${recordDurationMs}ms, sending to Gemini`, {
      recordDiagnostics,
    });
    const audioBase64 = wavBuffer.toString("base64");

    const response = await runVoiceConversationTurn(
      audioBase64,
      "audio/wav",
      context
    );

    // Step 3: Synthesize and play response on Pi speaker
    if (response.text) {
      try {
        await synthesizeAndSpeak(response.text);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        vlog.warn("tts", `TTS/playback failed (non-fatal): ${msg}`);
      }
    }

    const totalMs = Date.now() - turnStart;
    vlog.info("session", `OS-level turn complete (${totalMs}ms)`, {
      userText: response.userText?.slice(0, 120),
      text: response.text?.slice(0, 120),
      recordDurationMs,
      recordDiagnostics,
    });

    return NextResponse.json({
      status: "ok",
      ...response,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vlog.error("error", `Turn failed: ${message}`);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
