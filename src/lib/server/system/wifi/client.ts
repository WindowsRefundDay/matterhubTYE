import { execSync } from "node:child_process";
import type { WifiConfig } from "../config";
import type { WifiStatus, WifiConnectionDetails, WifiNetwork } from "@/types/system";

export class WifiClient {
  constructor(private readonly config: WifiConfig) {}

  // ── Read status ─────────────────────────────────────────────────────────

  async getStatus(): Promise<WifiStatus> {
    const radioOut = this.run("nmcli radio wifi");
    const wifiEnabled = radioOut === "enabled";

    const deviceOut = this.run(
      "nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status",
    );
    const lines = deviceOut.split("\n");

    const ethLine = lines.find((l) => l.includes(":ethernet:"));
    const ethState = ethLine ? ethLine.split(":")[2] ?? "unavailable" : "unavailable";

    const iface = this.config.interface;
    const wlanLine = lines.find((l) => l.startsWith(`${iface}:`));
    const [, , wlanState, wlanConnection] = wlanLine
      ? wlanLine.split(":")
      : [iface, "wifi", "disconnected", ""];

    let connectionDetails: WifiConnectionDetails | null = null;

    if (wlanState === "connected" && wlanConnection) {
      try {
        connectionDetails = this.readConnectionDetails(wlanConnection);
      } catch {
        // non-critical
      }
    }

    let networks: WifiNetwork[] = [];
    if (wifiEnabled) {
      try {
        networks = this.scanNetworks();
      } catch {
        // scan may fail if interface is unmanaged
      }
    }

    return {
      wifiEnabled,
      wlanState: wlanState?.trim() ?? "unknown",
      wlanConnection: wlanConnection?.trim() || null,
      ethState: ethState.trim(),
      connectionDetails,
      networks,
    };
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  toggle(): { wifiEnabled: boolean } {
    const radioOut = this.run("nmcli radio wifi");
    const enable = radioOut !== "enabled";
    this.run(`nmcli radio wifi ${enable ? "on" : "off"}`);
    return { wifiEnabled: enable };
  }

  connect(ssid: string, password?: string): void {
    const safeSsid = ssid.replace(/"/g, "");
    const iface = this.config.interface;

    // Remove existing connection for clean re-add
    try {
      this.run(`nmcli connection delete "${safeSsid}"`, 8000);
    } catch {
      // fine — might not exist
    }

    if (password) {
      this.run(
        `nmcli device wifi connect "${safeSsid}" password "${password.replace(/"/g, "")}" ifname ${iface}`,
        30000,
      );
    } else {
      this.run(
        `nmcli device wifi connect "${safeSsid}" ifname ${iface}`,
        30000,
      );
    }
  }

  disconnect(): void {
    this.run(`nmcli device disconnect ${this.config.interface}`, 10000);
  }

  forget(ssid: string): void {
    const safeSsid = ssid.replace(/"/g, "");
    try {
      this.run(`nmcli connection delete "${safeSsid}"`, 8000);
    } catch {
      // might not exist
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private run(cmd: string, timeout?: number): string {
    const prefix = this.config.commandPrefix;
    const fullCmd = prefix ? `${prefix} ${cmd}` : cmd;
    return execSync(fullCmd, {
      timeout: timeout ?? this.config.commandTimeout,
      encoding: "utf8",
    }).trim();
  }

  private readConnectionDetails(
    connectionName: string,
  ): WifiConnectionDetails {
    const safeConn = connectionName.replace(/"/g, "");
    const connOut = this.run(
      `nmcli -t -f 802-11-wireless.ssid,IP4.ADDRESS,IP4.GATEWAY,IP4.DNS,802-11-wireless-security.key-mgmt connection show "${safeConn}"`,
    );
    const fields: Record<string, string> = {};
    for (const line of connOut.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) fields[line.slice(0, idx)] = line.slice(idx + 1);
    }

    let signal = 0;
    let frequency = "";
    let linkSpeed = "";
    let macAddress = "";
    try {
      const activeOut = this.run(
        `nmcli -t -f SIGNAL,FREQ,RATE,BSSID dev wifi list ifname ${this.config.interface} --rescan no`,
      );
      const firstLine = activeOut.split("\n")[0] ?? "";
      const parts = firstLine.split(":");
      signal = parseInt(parts[0] ?? "0", 10);
      frequency = parts[1] ?? "";
      linkSpeed = parts[2] ?? "";
      macAddress = parts[3] ?? "";
    } catch {
      // non-critical
    }

    return {
      ssid: fields["802-11-wireless.ssid"] ?? connectionName,
      ip: fields["IP4.ADDRESS[1]"] ?? "",
      gateway: fields["IP4.GATEWAY"] ?? "",
      dns: fields["IP4.DNS[1]"] ?? "",
      security: fields["802-11-wireless-security.key-mgmt"] ?? "none",
      signal,
      frequency,
      linkSpeed,
      macAddress,
    };
  }

  private scanNetworks(): WifiNetwork[] {
    const scanOut = this.run(
      `nmcli --escape no -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list ifname ${this.config.interface}`,
    );
    return scanOut
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(":");
        return {
          inUse: parts[0]?.trim() === "*",
          ssid: parts[1]?.trim() ?? "",
          signal: parseInt(parts[2] ?? "0", 10),
          security: parts[3]?.trim() ?? "",
        };
      })
      .filter((n) => n.ssid)
      .reduce<WifiNetwork[]>((acc, n) => {
        const existing = acc.find((e) => e.ssid === n.ssid);
        if (!existing) acc.push(n);
        else if (n.signal > existing.signal) {
          existing.signal = n.signal;
          existing.inUse = existing.inUse || n.inUse;
        }
        return acc;
      }, [])
      .sort((a, b) => {
        if (a.inUse !== b.inUse) return a.inUse ? -1 : 1;
        return b.signal - a.signal;
      });
  }
}
