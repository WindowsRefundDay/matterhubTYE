import type { WifiStatus } from "@/types/system";

export function getMockWifiStatus(): WifiStatus {
  return {
    wifiEnabled: false,
    wlanState: "unavailable",
    wlanConnection: null,
    ethState: "unavailable",
    connectionDetails: null,
    networks: [],
  };
}
