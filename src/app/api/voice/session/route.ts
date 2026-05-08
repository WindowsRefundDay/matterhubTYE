import "server-only";

import { NextResponse } from "next/server";
import { startVoiceEngineSession } from "@/lib/server/voice-engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = startVoiceEngineSession();
  return NextResponse.json({ status: "ok", session });
}
