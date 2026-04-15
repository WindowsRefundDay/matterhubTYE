"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { useWifiStatus } from "@/hooks/use-wifi-status";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";

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
  const [toggling, setToggling] = useState(false);
  const { data, loading, performAction } = useWifiStatus({
    pollMs: 8000,
  });

  // Password entry modal
  const [connectSsid, setConnectSsid] = useState<string | null>(null);
  const [connectSecurity, setConnectSecurity] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Details modal
  const [showDetails, setShowDetails] = useState(false);

  const backTap = useTap(onBack);

  async function toggleWifi() {
    setToggling(true);
    try {
      await performAction(
        { action: "toggle" },
        { refreshDelayMs: 1500 },
      );
    } finally {
      setToggling(false);
    }
  }

  async function connectToNetwork() {
    if (!connectSsid) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await performAction(
        {
          action: "connect",
          ssid: connectSsid,
          password: password || undefined,
        },
        { refreshDelayMs: 1000 },
      );
      setConnectSsid(null);
      setPassword("");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    await performAction(
      { action: "disconnect" },
      { refreshDelayMs: 1000 },
    );
    setShowDetails(false);
  }

  async function forgetNetwork() {
    if (!data?.connectionDetails?.ssid) return;
    await performAction(
      { action: "forget", ssid: data.connectionDetails.ssid },
      { refreshDelayMs: 1000 },
    );
    setShowDetails(false);
  }

  const wifiEnabled = data?.wifiEnabled ?? false;
  const connected = data?.wlanState === "connected";
  const details = data?.connectionDetails;
  const activeSsid = details?.ssid ?? data?.wlanConnection ?? null;
  const otherNetworks =
    data?.networks.filter((n) => !n.inUse && n.ssid !== activeSsid) ?? [];
  const connectRequiresPassword =
    Boolean(connectSecurity) && connectSecurity !== "--" && connectSecurity !== "none";

  const toggleTap = useTap(toggleWifi);

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-8 pb-4">
        <button
          {...backTap}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition-transform active:scale-90"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <h1 className="font-serif text-[28px] tracking-tight text-foreground">Network</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide perf-scroll-region px-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px] uppercase tracking-widest text-muted">Scanning...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">Hardware</h2>
              <div className="flex flex-col">
                {/* Wi-Fi toggle row */}
                <div className="flex items-center justify-between py-5 border-b border-border">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg border",
                      wifiEnabled ? "bg-foreground text-background" : "bg-muted/5 text-muted border-border"
                    )}>
                      <Icon name={wifiEnabled ? "wifi" : "wifi-off"} size={22} />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-foreground">Wi-Fi Antenna</p>
                      <p className="text-[12px] text-muted">
                        {toggling
                          ? "State change in progress..."
                          : wifiEnabled
                            ? connected
                              ? data?.wlanConnection ?? "Active Connection"
                              : "Disconnected"
                            : "Hardware Disabled"}
                      </p>
                    </div>
                  </div>
                  <button
                    {...toggleTap}
                    disabled={toggling}
                    className={cn(
                      "w-10 h-6 rounded-md relative shrink-0 transition-colors duration-200",
                      wifiEnabled ? "bg-foreground" : "bg-muted/10 border border-border"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-sm transition-transform duration-200",
                      wifiEnabled ? "translate-x-5 bg-background" : "translate-x-1 bg-muted/40"
                    )} />
                  </button>
                </div>

                {/* Ethernet row */}
                <div className="flex items-center gap-5 py-5 border-b border-border">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg border",
                    data?.ethState === "connected" ? "bg-[var(--minimalist-pastel-green)] text-[var(--minimalist-pastel-green-fg)]" : "bg-muted/5 text-muted border-border"
                  )}>
                    <Icon name="ethernet" size={22} />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-foreground">Ethernet Port</p>
                    <p className="text-[12px] text-muted">
                      {data?.ethState === "connected" ? "Gigabit Link Active" : "No Physical Link"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Current connection */}
            {wifiEnabled && connected && details && (
              <section>
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">Active Link</h2>
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex w-full items-center gap-5 py-5 text-left border-b border-border transition-colors active:bg-muted/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-[var(--minimalist-pastel-blue)] text-[var(--minimalist-pastel-blue-fg)]">
                    <Icon name={signalIcon(details.signal)} size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-[15px] font-medium text-foreground truncate">{details.ssid}</p>
                      <span className="shrink-0 rounded-sm bg-foreground px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-background uppercase">
                        Active
                      </span>
                    </div>
                    <p className="text-[12px] text-muted mt-0.5">
                      {securityLabel(details.security)} · {details.signal}% Signal Strength
                    </p>
                  </div>
                  <Icon name="chevron-right" size={16} className="text-muted" />
                </button>
              </section>
            )}

            {/* Available networks */}
            {wifiEnabled && (
              <section>
                <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
                  Nearby Networks
                </h2>
                <div className="flex flex-col">
                  {otherNetworks.length === 0 ? (
                    <p className="py-6 text-[13px] text-muted italic">
                      No other signals detected in range
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
                        className="flex w-full items-center gap-5 py-4 text-left border-b border-border/50 transition-colors active:bg-muted/5"
                      >
                        <div className="flex h-10 w-10 items-center justify-center text-muted">
                          <Icon name={signalIcon(network.signal)} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-foreground truncate">{network.ssid}</p>
                          <p className="text-[11px] text-muted">
                            {securityLabel(network.security)}
                          </p>
                        </div>
                        {network.security && network.security !== "--" && network.security !== "none" && (
                          <Icon name="lock" size={14} className="text-muted/40" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ───── Connection details modal ───── */}
      {showDetails && details && (
        <div className="absolute inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center gap-4 px-6 pt-8 pb-4">
            <button
              onClick={() => setShowDetails(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted active:scale-90"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <h2 className="font-serif text-[24px] tracking-tight text-foreground">{details.ssid}</h2>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-32">
            {/* Status card */}
            <div className="mb-8 flex items-center gap-5 rounded-lg border border-border bg-muted/5 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-white text-foreground">
                <Icon name={signalIcon(details.signal)} size={28} />
              </div>
              <div>
                <p className="text-[14px] font-bold uppercase tracking-wider text-foreground">Link Established</p>
                <p className="text-[13px] text-muted mt-1">
                  Stable {details.frequency} signal at {details.signal}%
                </p>
              </div>
            </div>

            {/* Details list */}
            <div className="space-y-0 divide-y divide-border/50">
              <DetailRow label="Security Architecture" value={securityLabel(details.security)} />
              {details.ip && <DetailRow label="IPv4 Address" value={details.ip.split("/")[0] ?? details.ip} />}
              {details.gateway && <DetailRow label="Network Gateway" value={details.gateway} />}
              {details.dns && <DetailRow label="DNS Resolver" value={details.dns} />}
              {details.frequency && <DetailRow label="Radio Band" value={details.frequency} />}
              {details.linkSpeed && <DetailRow label="Current Link Speed" value={details.linkSpeed} />}
              {details.macAddress && <DetailRow label="Hardware ID (MAC)" value={details.macAddress} />}
            </div>

            {/* Actions */}
            <div className="mt-10 flex gap-4">
              <button
                onClick={disconnect}
                className="flex-1 rounded-md border border-border bg-background py-4 text-[12px] font-bold uppercase tracking-widest text-foreground transition-colors active:bg-muted/5"
              >
                Disconnect
              </button>
              <button
                onClick={forgetNetwork}
                className="flex-1 rounded-md bg-[var(--minimalist-pastel-red)] py-4 text-[12px] font-bold uppercase tracking-widest text-[var(--minimalist-pastel-red-fg)] transition-colors active:opacity-80"
              >
                Forget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Password / connect modal ───── */}
      {connectSsid && (
        <div className="absolute inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-4">
            <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6">
              <div className="mb-1 flex items-center gap-3">
                <h3 className="min-w-0 truncate font-serif text-[20px] text-foreground">{connectSsid}</h3>
              </div>
              <p className="mb-5 text-[12px] uppercase tracking-widest text-muted">
                {securityLabel(connectSecurity)} Authentication
              </p>

              {connectRequiresPassword && (
                <div className="mb-5">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    Network Password
                  </label>
                  <input
                    type="password"
                    placeholder="Tap keys below"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full rounded-md border border-border bg-muted/5 px-4 py-3 text-[16px] text-foreground placeholder:text-muted/30 transition-colors focus:border-foreground focus:outline-none"
                  />
                </div>
              )}

              {connectError && (
                <p className="mb-5 rounded-md border border-border/10 bg-[var(--minimalist-pastel-red)] px-4 py-3 text-[12px] text-[var(--minimalist-pastel-red-fg)]">
                  {connectError}
                </p>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => { setConnectSsid(null); setPassword(""); setConnectError(null); }}
                  className="flex-1 rounded-md border border-border py-3 text-[11px] font-bold uppercase tracking-widest text-muted transition-colors active:bg-muted/5"
                >
                  Cancel
                </button>
                <button
                  onClick={connectToNetwork}
                  disabled={connecting}
                  className={cn(
                    "flex-1 rounded-md py-3 text-[11px] font-bold uppercase tracking-widest transition-all",
                    connecting
                      ? "bg-muted text-background opacity-50"
                      : "bg-foreground text-background active:scale-95"
                  )}
                >
                  {connecting ? "Auth..." : "Connect"}
                </button>
              </div>
            </div>
          </div>

          {connectRequiresPassword && (
            <VirtualKeyboard
              value={password}
              onChange={setPassword}
              onDone={connectToNetwork}
              className="shrink-0 pb-[68px]"
            />
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="min-w-0 truncate text-right font-mono text-[12px] text-foreground">{value}</p>
    </div>
  );
}
