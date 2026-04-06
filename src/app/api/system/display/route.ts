import { NextRequest, NextResponse } from "next/server";
import { getDisplayState, handleDisplayAction } from "@/lib/server/system";
import type { DisplayAction } from "@/types/system";

export async function GET() {
  try {
    return NextResponse.json(await getDisplayState());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DisplayAction;
    const state = await handleDisplayAction(body);
    return NextResponse.json({ status: "ok", ...state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
