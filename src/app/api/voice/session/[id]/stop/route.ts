import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requestStopVoiceEngineSession } from "@/lib/server/voice-engine";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = requestStopVoiceEngineSession(id);

  if (!session) {
    return NextResponse.json(
      { status: "error", error: "Voice session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ status: "ok", session });
}
