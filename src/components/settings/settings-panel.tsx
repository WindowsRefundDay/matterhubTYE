"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";
import { useSmartHomeRuntime } from "@/hooks/use-smart-home";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";
import { WifiPanel } from "./wifi-panel";
import { DisplayPanel } from "./display-panel";

type WifiSummary = { wifiEnabled: boolean; wlanState: string; wlanConnection: string | null; ethState: string };
type DisplaySummary = { supported: boolean; screenOn: boolean; brightnessPercent: number; autoSleepEnabled: boolean; dimAfterSeconds: number; turnOffAfterSeconds: number; keepAwakeDuringDay: boolean; dayStartsAt: string; nightStartsAt: string };

export function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode] = useState(true);
  const [wifiView, setWifiView] = useState(false);
  const [displayView, setDisplayView] = useState(false);
  const { backendMode, backendStatus, diagnostics, errorMessage, lastSyncAt } =
    useSmartHomeRuntime();

  // Lightweight Wi-Fi summary for the settings row
  const [wifiSummary, setWifiSummary] = useState<WifiSummary | null>(null);
  const [displaySummary, setDisplaySummary] = useState<DisplaySummary | null>(null);

  const fetchWifiSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/system/wifi");
      if (res.ok) setWifiSummary(await res.json());
    } catch { /* non-critical */ }
  }, []);

  const fetchDisplaySummary = useCallback(async () => {
    try {
      const res = await fetch("/api/system/display", { cache: "no-store" });
      if (res.ok) setDisplaySummary(await res.json());
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void fetchWifiSummary();
      void fetchDisplaySummary();
    }, 0);

    return () => {
      window.clearTimeout(initialRefresh);
    };
  }, [fetchDisplaySummary, fetchWifiSummary]);

  // Refresh summaries when returning from sub-panels
  useEffect(() => {
    if (!wifiView) {
      const refresh = window.setTimeout(() => {
        void fetchWifiSummary();
      }, 0);
      return () => window.clearTimeout(refresh);
    }
    return;
  }, [wifiView, fetchWifiSummary]);

  useEffect(() => {
    if (!displayView) {
      const refresh = window.setTimeout(() => {
        void fetchDisplaySummary();
      }, 0);
      return () => window.clearTimeout(refresh);
    }
    return;
  }, [displayView, fetchDisplaySummary]);

  const wifiTap = useTap(() => setWifiView(true));
  const displayTap = useTap(() => setDisplayView(true));

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

  // ── Wi-Fi sub-page ──
  if (wifiView) {
    return <WifiPanel onBack={() => setWifiView(false)} />;
  }

  if (displayView) {
    return <DisplayPanel onBack={() => setDisplayView(false)} />;
  }

  // ── Wi-Fi summary for the row ──
  let displaySubtitle = "Loading...";
  if (displaySummary) {
    if (!displaySummary.supported) {
      displaySubtitle = "Unavailable";
    } else if (!displaySummary.screenOn) {
      displaySubtitle = "Screen off";
    } else {
      displaySubtitle = displaySummary.keepAwakeDuringDay
        ? `${displaySummary.brightnessPercent}% · day awake ${displaySummary.dayStartsAt}–${displaySummary.nightStartsAt}`
        : `${displaySummary.brightnessPercent}% · ${displaySummary.autoSleepEnabled ? `${displaySummary.dimAfterSeconds}s dim` : "sleep off"}`;
    }
  }

  let wifiSubtitle = "Loading...";
  if (wifiSummary) {
    if (!wifiSummary.wifiEnabled) {
      wifiSubtitle = "Off";
    } else if (wifiSummary.wlanState === "connected" && wifiSummary.wlanConnection) {
      wifiSubtitle = wifiSummary.wlanConnection;
    } else {
      wifiSubtitle = "Not connected";
    }
  }

  return (
    <div className="flex h-full flex-col">
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

        {/* ── Network & internet row (Android-style) ── */}
        <Section title="Network & internet">
          <button
            {...wifiTap}
            className="flex w-full items-center gap-4 py-3.5 text-left"
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              wifiSummary?.wifiEnabled ? "bg-accent/15 text-accent" : "bg-surface-raised text-foreground/30"
            )}>
              <Icon name={wifiSummary?.wifiEnabled ? "wifi" : "wifi-off"} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-foreground">Wi-Fi</p>
              <p className="text-[12px] text-foreground/40">{wifiSubtitle}</p>
            </div>
            <Icon name="chevron-right" size={16} className="text-foreground/25" />
          </button>
          <div className="flex items-center gap-4 py-3.5">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              wifiSummary?.ethState === "connected" ? "bg-emerald-500/15 text-emerald-400" : "bg-surface-raised text-foreground/30"
            )}>
              <Icon name="ethernet" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-foreground">Ethernet</p>
              <p className="text-[12px] text-foreground/40">
                {wifiSummary?.ethState === "connected" ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Appearance">
          <SettingRow label="Dark Mode" description="Always on for ambient display" toggle isOn={darkMode} />
          <SettingRow label="Accent Color" value="Amber" />
          <SettingRow label="Clock Format" value="12-hour" />
        </Section>

        <Section title="Display">
          <button
            {...displayTap}
            className="flex w-full items-center gap-4 py-3.5 text-left"
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              displaySummary?.screenOn ? "bg-accent/15 text-accent" : "bg-surface-raised text-foreground/30"
            )}>
              <Icon name="power" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-foreground">Screen & brightness</p>
              <p className="text-[12px] text-foreground/40">{displaySubtitle}</p>
            </div>
            <Icon name="chevron-right" size={16} className="text-foreground/25" />
          </button>
          <SettingRow label="Resolution" value="800 x 480" />
        </Section>

        <Section title="Notifications">
          <SettingRow label="Show Alerts" description="Motion, door events" toggle isOn={notifications} onToggle={() => setNotifications(!notifications)} />
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
