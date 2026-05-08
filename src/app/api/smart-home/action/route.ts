import { NextRequest, NextResponse } from "next/server";
import { loadHomeAssistantConfig } from "@/lib/server/ha/config";
import { HomeAssistantRestClient } from "@/lib/server/ha/rest";
import { resolveHomeAssistantServiceCall } from "@/lib/server/ha/service-actions";
import { readDemoSettings } from "@/lib/server/ha/demo/settings";
import type { SmartHomeActionRequest } from "@/types/smart-home";

const LIVE_DEMO_LIGHT_ID = "live_demo_light";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as SmartHomeActionRequest;
  const config = await loadHomeAssistantConfig();
  const demoSettings = await readDemoSettings();

  if (config.mode === "demo" || demoSettings.enabled) {
    // In demo mode, only the live light placeholder is allowed through
    const isLivePassthrough = payload.entityId === LIVE_DEMO_LIGHT_ID && demoSettings.liveEntityId;
    if (!isLivePassthrough) {
      return NextResponse.json(
        {
          status: "error",
          error: "Demo mode does not send Home Assistant service calls for simulated devices.",
        },
        { status: 409 }
      );
    }

    // Remap the placeholder ID to the real HA entity ID
    payload.entityId = demoSettings.liveEntityId!;
  }

  if (!config.token) {
    return NextResponse.json(
      { status: "error", error: "No Home Assistant token configured." },
      { status: 500 }
    );
  }

  try {
    const client = new HomeAssistantRestClient({ ...config, token: config.token });
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
