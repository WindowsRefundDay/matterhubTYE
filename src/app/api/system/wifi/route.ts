import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

function run(cmd: string, timeout = 15000): string {
  return execSync(cmd, { timeout, encoding: "utf8" }).trim();
}

export async function GET() {
  try {
    // Wi-Fi radio state
    const radioOut = run("nmcli radio wifi");
    const wifiEnabled = radioOut === "enabled";

    // All devices
    const deviceOut = run("nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status");
    const lines = deviceOut.split("\n");

    // Ethernet
    const ethLine = lines.find((l) => l.includes(":ethernet:"));
    const ethState = ethLine ? ethLine.split(":")[2] ?? "unavailable" : "unavailable";

    // wlan0
    const wlanLine = lines.find((l) => l.startsWith("wlan0:"));
    const [, , wlanState, wlanConnection] = wlanLine
      ? wlanLine.split(":")
      : ["wlan0", "wifi", "disconnected", ""];

    // Current connection details (if connected)
    let connectionDetails: {
      ssid: string;
      ip: string;
      gateway: string;
      dns: string;
      security: string;
      signal: number;
      frequency: string;
      linkSpeed: string;
      macAddress: string;
    } | null = null;

    if (wlanState === "connected" && wlanConnection) {
      try {
        const connOut = run(
          `nmcli -t -f 802-11-wireless.ssid,IP4.ADDRESS,IP4.GATEWAY,IP4.DNS,802-11-wireless-security.key-mgmt connection show "${wlanConnection.replace(/"/g, "")}"`
        );
        const fields: Record<string, string> = {};
        for (const line of connOut.split("\n")) {
          const idx = line.indexOf(":");
          if (idx > 0) fields[line.slice(0, idx)] = line.slice(idx + 1);
        }

        // Active connection signal/freq
        let signal = 0;
        let frequency = "";
        let linkSpeed = "";
        let macAddress = "";
        try {
          const activeOut = run(
            "nmcli -t -f SIGNAL,FREQ,RATE,BSSID dev wifi list ifname wlan0 --rescan no"
          );
          const firstLine = activeOut.split("\n")[0] ?? "";
          const parts = firstLine.split(":");
          signal = parseInt(parts[0] ?? "0", 10);
          frequency = parts[1] ?? "";
          linkSpeed = parts[2] ?? "";
          macAddress = parts[3] ?? "";
        } catch { /* non-critical */ }

        connectionDetails = {
          ssid: fields["802-11-wireless.ssid"] ?? wlanConnection,
          ip: fields["IP4.ADDRESS[1]"] ?? "",
          gateway: fields["IP4.GATEWAY"] ?? "",
          dns: fields["IP4.DNS[1]"] ?? "",
          security: fields["802-11-wireless-security.key-mgmt"] ?? "none",
          signal,
          frequency,
          linkSpeed,
          macAddress,
        };
      } catch { /* non-critical */ }
    }

    // Scan for nearby networks
    let networks: Array<{ ssid: string; signal: number; security: string; inUse: boolean }> = [];
    if (wifiEnabled) {
      try {
        const scanOut = run(
          "nmcli --escape no -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list ifname wlan0"
        );
        networks = scanOut
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
          .reduce<Array<{ ssid: string; signal: number; security: string; inUse: boolean }>>(
            (acc, n) => {
              const existing = acc.find((e) => e.ssid === n.ssid);
              if (!existing) acc.push(n);
              else if (n.signal > existing.signal) {
                existing.signal = n.signal;
                existing.inUse = existing.inUse || n.inUse;
              }
              return acc;
            },
            []
          )
          .sort((a, b) => {
            if (a.inUse !== b.inUse) return a.inUse ? -1 : 1;
            return b.signal - a.signal;
          });
      } catch {
        // scan may fail if interface is unmanaged
      }
    }

    return NextResponse.json({
      wifiEnabled,
      wlanState: wlanState?.trim() ?? "unknown",
      wlanConnection: wlanConnection?.trim() || null,
      ethState: ethState.trim(),
      connectionDetails,
      networks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    action?: "toggle" | "connect" | "disconnect" | "forget";
    ssid?: string;
    password?: string;
  };

  const { action = "connect", ssid, password } = body;

  try {
    if (action === "toggle") {
      const radioOut = run("nmcli radio wifi");
      const enable = radioOut !== "enabled";
      run(`nmcli radio wifi ${enable ? "on" : "off"}`);
      return NextResponse.json({ status: "ok", wifiEnabled: enable });
    }

    if (action === "disconnect") {
      run("nmcli device disconnect wlan0", 10000);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "forget" && ssid) {
      const safeSsid = ssid.replace(/"/g, "");
      try {
        run(`nmcli connection delete "${safeSsid}"`, 8000);
      } catch { /* might not exist */ }
      return NextResponse.json({ status: "ok" });
    }

    // connect
    if (!ssid || typeof ssid !== "string" || ssid.length > 64) {
      return NextResponse.json({ error: "Invalid SSID" }, { status: 400 });
    }
    if (password !== undefined && (typeof password !== "string" || password.length > 128)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const safeSsid = ssid.replace(/"/g, "");
    // Remove existing connection for clean re-add
    try {
      run(`nmcli connection delete "${safeSsid}"`, 8000);
    } catch { /* fine */ }

    if (password) {
      run(
        `nmcli device wifi connect "${safeSsid}" password "${password.replace(/"/g, "")}" ifname wlan0`,
        30000
      );
    } else {
      run(`nmcli device wifi connect "${safeSsid}" ifname wlan0`, 30000);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
