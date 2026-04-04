import { NextResponse } from "next/server";
import { loadHomeAssistantConfig } from "@/lib/server/ha/config";
import { HomeAssistantRestClient } from "@/lib/server/ha/rest";

export async function GET() {
  const config = await loadHomeAssistantConfig();

  if (config.errors.length > 0) {
    return NextResponse.json(
      {
        status: "degraded",
        backend: config.mode,
        errors: config.errors,
      },
      { status: 503 }
    );
  }

  if (config.mode === "mock") {
    return NextResponse.json({
      status: "degraded",
      backend: config.mode,
      errors: [
        "Mock backend is active. Production paths must use a real Home Assistant connection.",
      ],
    });
  }

  try {
    const client = new HomeAssistantRestClient(config);
    const apiRoot = await client.getConfig();

    return NextResponse.json({
      status: "ok",
      backend: config.mode,
      baseUrl: config.baseUrl,
      tokenSource: config.tokenSource,
      version: typeof apiRoot.version === "string" ? apiRoot.version : null,
      locationName:
        typeof apiRoot.location_name === "string" ? apiRoot.location_name : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        backend: config.mode,
        baseUrl: config.baseUrl,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
