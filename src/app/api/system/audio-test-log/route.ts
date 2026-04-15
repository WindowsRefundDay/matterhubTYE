import { NextRequest, NextResponse } from "next/server";
import {
  appendAudioTestLog,
  readRecentAudioTestLogs,
} from "@/lib/server/system/audio-test-log";

export async function GET() {
  try {
    const entries = await readRecentAudioTestLogs();
    return NextResponse.json({ status: "ok", entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      event: string;
      details?: Record<string, unknown>;
    };

    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const entry = await appendAudioTestLog(body);
    return NextResponse.json({ status: "ok", entry });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
