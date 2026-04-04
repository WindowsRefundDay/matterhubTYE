"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";
import { useSmartHomeRuntime } from "@/hooks/use-smart-home";
import { cn } from "@/lib/utils";

type WifiNetwork = { ssid: string; signal: number; security: string };
type WifiStatus = { state: string; connection: string | null; networks: WifiNetwork[] };

export function SettingsPanel() {
  const [autoSleep, setAutoSleep] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode] = useState(true);
  const { backendMode, backendStatus, diagnostics, errorMessage, lastSyncAt } =
    useSmartHomeRuntime();

  // WiFi state
  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null);
  const [wifiOpen, setWifiOpen] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSaving, setWifiSaving] = useState(false);
  const [wifiError, setWifiError] = useState<string | null>(null);
  const [wifiSuccess, setWifiSuccess] = useState(false);

  const fetchWifiStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/system/wifi");
      if (res.ok) setWifiStatus(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchWifiStatus();
  }, [fetchWifiStatus]);

  async function connectWifi() {
    if (!selectedSsid) return;
    setWifiSaving(true);
    setWifiError(null);
    setWifiSuccess(false);
    try {
      const res = await fetch("/api/system/wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid: selectedSsid, password: wifiPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect");
      setWifiSuccess(true);
      setWifiPassword("");
      await fetchWifiStatus();
    } catch (err) {
      setWifiError(err instanceof Error ? err.message : String(err));
    } finally {
      setWifiSaving(false);
    }
  }

  const statusSummary = useMemo(() => {
    if (backendMode === "home-assistant" && backendStatus === "ok") {
      return {
        title: "Connected to Home Assistant",
        subtitle: lastSyncAt
          ? `Live state synced ${new Date(lastSyncAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : "Live state is active on this appliance",
        icon: "wifi",
        tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
      };
    }

    if (backendMode === "home-assistant") {
      return {
        title: backendStatus === "loading" ? "Connecting to Home Assistant" : "Home Assistant needs attention",
        subtitle:
          errorMessage ??
          "MatterHub is configured for Home Assistant, but the latest sync did not complete cleanly.",
        icon: "wifi-off",
        tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
      };
    }

    return {
      title: "Awaiting appliance provisioning",
      subtitle: "Home Assistant pairing is not configured yet",
      icon: "wifi-off",
      tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    };
  }, [backendMode, backendStatus, errorMessage, lastSyncAt]);

  const systemAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      icon: string;
      title: string;
      description: string;
      tone: string;
    }> = [];

    if (backendMode !== "home-assistant") {
      alerts.push({
        id: "setup",
        icon: "wifi",
        title: "Setup required",
        description:
          "Home Assistant pairing is not configured yet. Use /setup for the first-boot Wi-Fi and token flow.",
        tone: "text-amber-200 border-amber-500/25 bg-amber-500/10",
      });
    }

    if (backendMode === "mock") {
      alerts.push({
        id: "demo",
        icon: "info",
        title: "Demo fixtures still active",
        description:
          "The current UI is still powered by mock device data until the HA backend lane lands production data sources.",
        tone: "text-sky-100 border-sky-500/25 bg-sky-500/10",
      });
    }

    if (backendMode === "home-assistant" && diagnostics.length > 0) {
      alerts.push({
        id: "diagnostics",
        icon: "info",
        title: "Some entities are hidden from this UI",
        description: `${diagnostics.length} Home Assistant entities were excluded because their domains are not mapped into MatterHub yet.`,
        tone: "text-sky-100 border-sky-500/25 bg-sky-500/10",
      });
    }

    return alerts;
  }, [backendMode, diagnostics.length]);

  return (
    <div className="relative flex h-full flex-col">
      <h1 className="mb-4 text-[20px] font-medium text-foreground">Settings</h1>
      <div className="perf-scroll-region flex-1 space-y-5 overflow-y-auto scrollbar-hide">
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${statusSummary.tone}`}>
          <Icon name={statusSummary.icon} size={18} className="shrink-0" />
          <div>
            <p className="text-[13px] font-medium">{statusSummary.title}</p>
            <p className="text-[11px] text-current/70">{statusSummary.subtitle}</p>
          </div>
        </div>

        <Section title="Provisioning">
          <SettingRow label="Setup preview" value="/setup" />
          <SettingRow label="Maintenance preview" value="/maintenance" />
          <SettingRow
            label="Pairing status"
            value={backendMode === "home-assistant" ? "Paired" : "Not paired"}
          />
        </Section>

        {systemAlerts.length > 0 && (
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border px-4 py-3 ${alert.tone}`}>
                <div className="flex items-start gap-3">
                  <Icon name={alert.icon} size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium">{alert.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-current/75">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Section title="Appearance">
          <SettingRow label="Dark Mode" description="Always on for ambient display" toggle isOn={darkMode} />
          <SettingRow label="Accent Color" value="Amber" />
          <SettingRow label="Clock Format" value="12-hour" />
        </Section>

        <Section title="Display">
          <SettingRow label="Auto Sleep" description="Dim after 5 minutes" toggle isOn={autoSleep} onToggle={() => setAutoSleep(!autoSleep)} />
          <SettingRow label="Brightness" value="80%" />
          <SettingRow label="Idle Timeout" value="30 seconds" />
        </Section>

        <Section title="Notifications">
          <SettingRow label="Show Alerts" description="Motion, door events" toggle isOn={notifications} onToggle={() => setNotifications(!notifications)} />
        </Section>

        <Section title="Wi-Fi">
          <SettingRow
            label="Status"
            value={
              wifiStatus
                ? wifiStatus.state === "connected"
                  ? `Connected — ${wifiStatus.connection}`
                  : wifiStatus.state
                : "Loading…"
            }
          />
          <div className="py-3">
            <button
              onPointerDown={() => {
                setWifiOpen(true);
                setWifiError(null);
                setWifiSuccess(false);
                fetchWifiStatus();
              }}
              className="w-full rounded-xl bg-surface-raised px-4 py-2.5 text-left text-[13px] font-medium text-foreground/80 hover:bg-surface-raised/80"
            >
              Configure Wi-Fi network…
            </button>
          </div>
        </Section>

        <Section title="System">
          <SettingRow
            label="Runtime mode"
            value={backendMode === "home-assistant" ? "Live Home Assistant" : "Preview / mock data"}
          />
          <SettingRow
            label="Backend status"
            value={backendStatus === "ok" ? "Connected" : backendStatus}
          />
          <SettingRow label="Target device" value="MatterHub Arch ARM appliance" />
          <SettingRow label="Resolution" value="800 x 480" />
        </Section>
      </div>

      {/* Wi-Fi configuration modal */}
      {wifiOpen && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 pb-4">
          <div className="w-full max-w-sm rounded-2xl border border-border/20 bg-surface px-5 py-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">Configure Wi-Fi</h3>
              <button
                onPointerDown={() => { setWifiOpen(false); setWifiError(null); setWifiSuccess(false); }}
                className="text-foreground/40 hover:text-foreground/70"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Network list */}
            {wifiStatus && wifiStatus.networks.length > 0 ? (
              <div className="mb-3 max-h-40 overflow-y-auto rounded-xl border border-border/20 divide-y divide-border/10">
                {wifiStatus.networks.map((n) => (
                  <button
                    key={n.ssid}
                    onPointerDown={() => { setSelectedSsid(n.ssid); setWifiPassword(""); setWifiError(null); setWifiSuccess(false); }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] transition-colors",
                      selectedSsid === n.ssid
                        ? "bg-accent/20 text-foreground"
                        : "text-foreground/70 hover:bg-surface-raised"
                    )}
                  >
                    <span className="font-medium">{n.ssid}</span>
                    <span className="flex items-center gap-1.5 text-foreground/40">
                      {n.security && <Icon name="lock" size={12} />}
                      <span>{n.signal}%</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-[12px] text-foreground/40">
                {wifiStatus ? "No networks found nearby." : "Scanning…"}
              </p>
            )}

            {/* Manual SSID entry */}
            <input
              type="text"
              placeholder="SSID (network name)"
              value={selectedSsid}
              onChange={(e) => setSelectedSsid(e.target.value)}
              className="mb-2 w-full rounded-xl border border-border/20 bg-surface-raised px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="password"
              placeholder="Password (leave blank for open networks)"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              className="mb-3 w-full rounded-xl border border-border/20 bg-surface-raised px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-accent"
            />

            {wifiError && (
              <p className="mb-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                {wifiError}
              </p>
            )}
            {wifiSuccess && (
              <p className="mb-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300">
                Connected successfully.
              </p>
            )}

            <button
              onPointerDown={connectWifi}
              disabled={wifiSaving || !selectedSsid}
              className={cn(
                "w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors",
                wifiSaving || !selectedSsid
                  ? "bg-surface-raised text-foreground/30"
                  : "bg-accent text-white hover:bg-accent/80"
              )}
            >
              {wifiSaving ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="perf-section">
      <h2 className="mb-1 text-[13px] font-medium uppercase tracking-wider text-foreground/40">
        {title}
      </h2>
      <div className="divide-y divide-border/20">{children}</div>
    </section>
  );
}
