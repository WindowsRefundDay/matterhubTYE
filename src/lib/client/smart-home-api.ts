"use client";

import type {
  SmartHomeActionRequest,
  SmartHomeSnapshot,
} from "@/types/smart-home";

interface BootstrapResponseSuccess {
  status: "ok" | "degraded";
  snapshot: SmartHomeSnapshot;
}

interface BootstrapResponseError {
  status: "error";
  error?: string;
  details?: string[];
}

type BootstrapResponse = BootstrapResponseSuccess | BootstrapResponseError;

type ActionResponse =
  | { status: "ok" }
  | { status: "error"; error?: string };

export async function fetchSmartHomeSnapshot(): Promise<BootstrapResponse> {
  const response = await fetch("/api/smart-home/bootstrap", {
    cache: "no-store",
  });

  return (await response.json()) as BootstrapResponse;
}

export async function postSmartHomeAction(
  request: SmartHomeActionRequest,
): Promise<void> {
  const response = await fetch("/api/smart-home/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as ActionResponse;
  if (!response.ok || payload.status !== "ok") {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Smart-home action failed.",
    );
  }
}
