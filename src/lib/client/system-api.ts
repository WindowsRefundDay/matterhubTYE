"use client";

import type { AudioTestLogEntry } from "@/types/audio";
import type {
  DisplayAction,
  DisplayState,
  WifiAction,
  WifiStatus,
} from "@/types/system";

interface DisplayActionResponse extends DisplayState {
  status: "ok";
}

interface WifiActionResponse {
  status: "ok";
  wifiEnabled?: boolean;
}

interface AudioTestLogResponse {
  status: "ok";
  entry: Record<string, unknown>;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchDisplayState(): Promise<DisplayState> {
  const response = await fetch("/api/system/display", { cache: "no-store" });
  return readJson<DisplayState>(response);
}

export async function postDisplayAction(
  action: DisplayAction,
): Promise<DisplayState> {
  const response = await fetch("/api/system/display", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  const payload = await readJson<DisplayActionResponse>(response);
  return payload;
}

export async function fetchWifiStatus(): Promise<WifiStatus> {
  const response = await fetch("/api/system/wifi", { cache: "no-store" });
  return readJson<WifiStatus>(response);
}

export async function postWifiAction(
  action: WifiAction,
): Promise<WifiActionResponse> {
  const response = await fetch("/api/system/wifi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  return readJson<WifiActionResponse>(response);
}

export async function postAudioTestLog(
  entry: AudioTestLogEntry,
): Promise<Record<string, unknown>> {
  const response = await fetch("/api/system/audio-test-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });

  const payload = await readJson<AudioTestLogResponse>(response);
  return payload.entry;
}
