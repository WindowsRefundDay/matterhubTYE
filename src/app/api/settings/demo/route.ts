import { NextRequest, NextResponse } from "next/server";
import {
  readDemoSettings,
  writeDemoSettings,
} from "@/lib/server/ha/demo/settings";

export async function GET() {
  const settings = await readDemoSettings();
  return NextResponse.json({ status: "ok", settings });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { enabled?: unknown }
    | null;

  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { status: "error", error: "Body must include { enabled: boolean }." },
      { status: 400 },
    );
  }

  const settings = await writeDemoSettings({ enabled: body.enabled });
  return NextResponse.json({ status: "ok", settings });
}
