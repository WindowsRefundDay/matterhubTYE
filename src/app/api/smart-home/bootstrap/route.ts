import { NextResponse } from "next/server";
import { HomeAssistantConfigError, HomeAssistantRequestError, HomeAssistantWebSocketError } from "@/lib/server/ha/errors";
import { loadHomeAssistantConfig } from "@/lib/server/ha/config";
import { buildDemoSmartHomeSnapshot } from "@/lib/server/ha/demo";
import { readDemoSettings } from "@/lib/server/ha/demo/settings";
import { loadSmartHomeSnapshot } from "@/lib/server/ha";

export async function GET() {
  const config = await loadHomeAssistantConfig();

  if (config.mode === "demo") {
    if (config.errors.length > 0) {
      return NextResponse.json(
        {
          status: "error",
          errors: config.errors,
        },
        { status: 500 }
      );
    }

    const toggle = await readDemoSettings();
    return NextResponse.json({
      status: "ok",
      snapshot: buildDemoSmartHomeSnapshot(toggle.enabled ? "toggle" : "env"),
    });
  }

  try {
    const snapshot = await loadSmartHomeSnapshot();

    return NextResponse.json({
      status: snapshot.diagnostics.some((item) => item.level === "error")
        ? "degraded"
        : "ok",
      snapshot,
    });
  } catch (error) {
    if (
      error instanceof HomeAssistantConfigError ||
      error instanceof HomeAssistantRequestError ||
      error instanceof HomeAssistantWebSocketError
    ) {
      return NextResponse.json(
        {
          status: "degraded",
          error: error.message,
          details: "details" in error ? error.details : undefined,
        },
        { status: error instanceof HomeAssistantConfigError ? 500 : 503 }
      );
    }

    throw error;
  }
}
