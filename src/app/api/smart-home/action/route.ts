import { NextRequest, NextResponse } from "next/server";
import { requireHomeAssistantConfig } from "@/lib/server/ha/config";
import { HomeAssistantRestClient } from "@/lib/server/ha/rest";
import { resolveHomeAssistantServiceCall } from "@/lib/server/ha/service-actions";
import type { SmartHomeActionRequest } from "@/lib/server/ha/types";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as SmartHomeActionRequest;
  const config = await requireHomeAssistantConfig();

  if (config.mode === "mock") {
    return NextResponse.json(
      {
        status: "error",
        error: "Mock backend does not support Home Assistant service calls.",
      },
      { status: 409 }
    );
  }

  try {
    const client = new HomeAssistantRestClient(config);
    const serviceCall = resolveHomeAssistantServiceCall(payload);
    const result = await client.callService(serviceCall);

    return NextResponse.json({
      status: "ok",
      serviceCall,
      result,
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
