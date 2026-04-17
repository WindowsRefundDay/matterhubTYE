import { NextRequest, NextResponse } from "next/server";
import { getAudioStatus, handleAudioAction } from "@/lib/server/system";
import type { AudioAction } from "@/lib/server/system/audio";

function isAudioAction(value: unknown): value is AudioAction {
  if (typeof value !== "object" || value === null || !("action" in value)) {
    return false;
  }

  const action = (value as { action?: unknown }).action;
  return action === "speaker_test" || action === "mic_test";
}

export async function GET() {
  try {
    return NextResponse.json(await getAudioStatus());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isAudioAction(body)) {
    return NextResponse.json({ error: "Invalid audio action" }, { status: 400 });
  }

  try {
    const result = await handleAudioAction(body);
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
