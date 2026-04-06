import "server-only";

import { loadSystemConfig } from "../config";
import { WifiClient } from "./client";
import { getMockWifiStatus } from "./mock";
import type { WifiStatus, WifiAction } from "@/types/system";

export async function getWifiStatus(): Promise<WifiStatus> {
  const config = await loadSystemConfig();
  if (config.wifi.mode === "mock") return getMockWifiStatus();
  return new WifiClient(config.wifi).getStatus();
}

export async function handleWifiAction(
  action: WifiAction,
): Promise<{ status: "ok"; wifiEnabled?: boolean }> {
  const config = await loadSystemConfig();

  if (config.wifi.mode === "mock") {
    return { status: "ok" };
  }

  const client = new WifiClient(config.wifi);

  switch (action.action) {
    case "toggle": {
      const result = client.toggle();
      return { status: "ok", wifiEnabled: result.wifiEnabled };
    }
    case "connect":
      client.connect(action.ssid, action.password);
      return { status: "ok" };
    case "disconnect":
      client.disconnect();
      return { status: "ok" };
    case "forget":
      client.forget(action.ssid);
      return { status: "ok" };
  }
}
