import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { runVoiceConversationTurn } from "@/lib/server/voice/executor";
import type { VoiceContext } from "@/lib/server/voice/executor";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      audio: string;
      mimeType: string;
      context: VoiceContext;
    };

    if (!body.audio || !body.mimeType) {
      return NextResponse.json(
        { status: "error", error: "Missing audio or mimeType." },
        { status: 400 }
      );
    }

    // Strip data URL prefix if present (e.g. "data:audio/webm;base64,...")
    const base64Audio = body.audio.includes(",")
      ? body.audio.split(",")[1] ?? body.audio
      : body.audio;

    const response = await runVoiceConversationTurn(
      base64Audio,
      body.mimeType,
      body.context ?? { devices: [], rooms: [], scenes: [] }
    );

    return NextResponse.json({ status: "ok", ...response });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
