import { NextRequest, NextResponse } from "next/server";
import { validateHomeAssistantConnection } from "@/lib/server/ha";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    baseUrl?: string;
    token?: string;
  };

  try {
    const result = await validateHomeAssistantConnection(body.baseUrl, body.token);
    return NextResponse.json({
      status: "ok",
      connection: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
