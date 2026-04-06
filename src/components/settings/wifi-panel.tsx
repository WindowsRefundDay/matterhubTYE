"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";
import type { WifiStatus } from "@/types/system";

function signalIcon(signal: number): string {
  if (signal >= 60) return "signal-high";
  if (signal >= 30) return "signal-medium";
  return "signal-low";
}

function securityLabel(sec: string): string {
  if (!sec || sec === "--" || sec === "none") return "Open";
  return sec;
}

export function WifiPanel({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<WifiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Password entry modal
  const [connectSsid, setConnectSsid] = useState<string | null>(null);
  const [connectSecurity, setConnectSecurity] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Details modal
  const [showDetails, setShowDetails] = useState(false);

  const backTap = useTap(onBack);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/system/wifi");
      if (res.ok) setData(await res.json());
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function toggleWifi() {
    setToggling(true);
    try {
      const res = await fetch("/api/system/wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      if (res.ok) {
        // Give NetworkManager a moment to settle
        await new Promise((r) => setTimeout(r, 1500));
        await fetchData();
      }
    } finally {
      setToggling(false);
    }
  }

  async function connectToNetwork() {
    if (!connectSsid) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/system/wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          ssid: connectSsid,
          password: password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Connection failed");
      setConnectSsid(null);
      setPassword("");
      await new Promise((r) => setTimeout(r, 1000));
      await fetchData();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    await fetch("/api/system/wifi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setShowDetails(false);
    await new Promise((r) => setTimeout(r, 1000));
    await fetchData();
  }

  async function forgetNetwork() {
    if (!data?.connectionDetails?.ssid) return;
    await fetch("/api/system/wifi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forget", ssid: data.connectionDetails.ssid }),
    });
    setShowDetails(false);
    await new Promise((r) => setTimeout(r, 1000));
    await fetchData();
  }

  const wifiEnabled = data?.wifiEnabled ?? false;
  const connected = data?.wlanState === "connected";
  const details = data?.connectionDetails;
  const otherNetworks = data?.networks.filter((n) => !n.inUse) ?? [];

  const toggleTap = useTap(toggleWifi);

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          {...backTap}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-foreground/50 transition-transform active:scale-90"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <h1 className="text-[20px] font-medium text-foreground">Network & internet</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide perf-scroll-region">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px] text-foreground/40">Loading...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Wi-Fi toggle row */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  wifiEnabled ? "bg-accent/15 text-accent" : "bg-surface-raised text-foreground/30"
                )}>
                  <Icon name={wifiEnabled ? "wifi" : "wifi-off"} size={20} />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-foreground">Wi-Fi</p>
                  <p className="text-[12px] text-foreground/40">
                    {toggling
                      ? "Turning " + (wifiEnabled ? "off" : "on") + "..."
                      : wifiEnabled
                        ? connected
                          ? data?.wlanConnection ?? "Connected"
                          : "Not connected"
                        : "Off"}
                  </p>
                </div>
              </div>
              <button
                {...toggleTap}
                disabled={toggling}
                className={cn(
                  "w-11 h-6 rounded-full relative shrink-0 transition-colors",
                  wifiEnabled ? "bg-accent" : "bg-surface-raised"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  wifiEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                )} />
              </button>
            </div>

            {/* Ethernet row */}
            <div className="flex items-center gap-4 rounded-2xl px-4 py-3.5">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                data?.ethState === "connected" ? "bg-emerald-500/15 text-emerald-400" : "bg-surface-raised text-foreground/30"
              )}>
                <Icon name="ethernet" size={20} />
              </div>
              <div>
                <p className="text-[15px] font-medium text-foreground">Ethernet</p>
                <p className="text-[12px] text-foreground/40">
                  {data?.ethState === "connected" ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-border/15" />

            {/* Current connection */}
            {wifiEnabled && connected && details && (
              <>
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors active:bg-surface-raised/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Icon name={signalIcon(details.signal)} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-medium text-foreground truncate">{details.ssid}</p>
                      <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        CONNECTED
                      </span>
                    </div>
                    <p className="text-[12px] text-foreground/40">
                      {securityLabel(details.security)} · Signal {details.signal}%
                    </p>
                  </div>
                  <Icon name="chevron-right" size={16} className="text-foreground/25" />
                </button>
                <div className="mx-4 border-t border-border/15" />
              </>
            )}

            {/* Available networks */}
            {wifiEnabled && (
              <div className="pt-2">
                <p className="px-4 pb-2 text-[12px] font-medium uppercase tracking-wider text-foreground/30">
                  Available networks
                </p>
                {otherNetworks.length === 0 ? (
                  <p className="px-4 py-4 text-[13px] text-foreground/30">
                    No other networks found
                  </p>
                ) : (
                  otherNetworks.map((network) => (
                    <button
                      key={network.ssid}
                      onClick={() => {
                        setConnectSsid(network.ssid);
                        setConnectSecurity(network.security);
                        setPassword("");
                        setConnectError(null);
                      }}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors active:bg-surface-raised/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center text-foreground/40">
                        <Icon name={signalIcon(network.signal)} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-foreground truncate">{network.ssid}</p>
                        <p className="text-[11px] text-foreground/35">
                          {securityLabel(network.security)}
                        </p>
                      </div>
                      {network.security && network.security !== "--" && network.security !== "none" && (
                        <Icon name="lock" size={14} className="text-foreground/25" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───── Connection details modal ───── */}
      {showDetails && details && (
        <div className="absolute inset-0 z-50 flex flex-col bg-background/95">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={() => setShowDetails(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-foreground/50 active:scale-90"
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <h2 className="text-[18px] font-medium text-foreground">{details.ssid}</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide">
            {/* Status card */}
            <div className="mb-5 flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Icon name={signalIcon(details.signal)} size={24} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">Connected</p>
                <p className="text-[12px] text-foreground/50">
                  Signal strength: {details.signal}%
                </p>
              </div>
            </div>

            {/* Details list */}
            <div className="space-y-0 divide-y divide-border/10">
              <DetailRow label="Security" value={securityLabel(details.security)} />
              {details.ip && <DetailRow label="IP address" value={details.ip.split("/")[0] ?? details.ip} />}
              {details.gateway && <DetailRow label="Gateway" value={details.gateway} />}
              {details.dns && <DetailRow label="DNS" value={details.dns} />}
              {details.frequency && <DetailRow label="Frequency" value={details.frequency} />}
              {details.linkSpeed && <DetailRow label="Link speed" value={details.linkSpeed} />}
              {details.macAddress && <DetailRow label="MAC address" value={details.macAddress} />}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={disconnect}
                className="flex-1 rounded-xl border border-border/20 bg-surface-raised py-3 text-[13px] font-medium text-foreground/70 transition-colors active:bg-surface-raised/60"
              >
                Disconnect
              </button>
              <button
                onClick={forgetNetwork}
                className="flex-1 rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-[13px] font-medium text-red-400 transition-colors active:bg-red-500/20"
              >
                Forget network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Password / connect modal ───── */}
      {connectSsid && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-border/20 bg-surface px-5 py-5 shadow-xl">
            <div className="mb-1 flex items-center gap-3">
              <Icon name="wifi" size={20} className="text-foreground/50" />
              <h3 className="text-[16px] font-semibold text-foreground">{connectSsid}</h3>
            </div>
            <p className="mb-4 text-[12px] text-foreground/40">
              {securityLabel(connectSecurity)}
            </p>

            {connectSecurity && connectSecurity !== "--" && connectSecurity !== "none" && (
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="mb-3 w-full rounded-xl border border-border/20 bg-surface-raised px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            )}

            {connectError && (
              <p className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-300">
                {connectError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setConnectSsid(null); setPassword(""); setConnectError(null); }}
                className="flex-1 rounded-xl border border-border/20 py-2.5 text-[13px] font-medium text-foreground/60 transition-colors active:bg-surface-raised"
              >
                Cancel
              </button>
              <button
                onClick={connectToNetwork}
                disabled={connecting}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-colors",
                  connecting
                    ? "bg-surface-raised text-foreground/30"
                    : "bg-accent text-white active:bg-accent/80"
                )}
              >
                {connecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[13px] text-foreground/50">{label}</span>
      <span className="text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}
