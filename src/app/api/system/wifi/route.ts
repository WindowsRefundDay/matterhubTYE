import { NextRequest, NextResponse } from "next/server";
import { getWifiStatus, handleWifiAction } from "@/lib/server/system";
import type { WifiAction } from "@/types/system";

export async function GET() {
  try {
    return NextResponse.json(await getWifiStatus());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as WifiAction;

  if (body.action === "connect") {
    if (!body.ssid || typeof body.ssid !== "string" || body.ssid.length > 64) {
      return NextResponse.json({ error: "Invalid SSID" }, { status: 400 });
    }
    if (
      body.password !== undefined &&
      (typeof body.password !== "string" || body.password.length > 128)
    ) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }
  }

  try {
    const result = await handleWifiAction(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
