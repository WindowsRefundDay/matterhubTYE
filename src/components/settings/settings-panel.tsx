"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";
import { useSmartHomeRuntime } from "@/hooks/use-smart-home";
import { useDisplayState } from "@/hooks/use-display-state";
import { useWifiStatus } from "@/hooks/use-wifi-status";
import {
  fetchAudioStatus,
  postAudioAction,
  postAudioTestLog,
} from "@/lib/client/system-api";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";
import { WifiPanel } from "./wifi-panel";
import { DisplayPanel } from "./display-panel";
import { DemoModePanel } from "./demo-mode-panel";
import type { AudioAction, AudioStatus } from "@/types/system";

export function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode] = useState(true);
  const [wifiView, setWifiView] = useState(false);
  const [displayView, setDisplayView] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus | null>(null);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioAction, setAudioAction] = useState<AudioAction["action"] | null>(null);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const { backendMode, backendStatus, diagnostics, errorMessage, lastSyncAt } =
    useSmartHomeRuntime();

  const {
    data: wifiSummary,
    refresh: refreshWifiSummary,
  } = useWifiStatus({ pollMs: wifiView ? null : 8000 });
  const {
    data: displaySummary,
    refresh: refreshDisplaySummary,
  } = useDisplayState({ pollMs: 10000 });

  const logAudioEvent = useCallback(
    (event: string, details: Record<string, unknown> = {}) => {
      void postAudioTestLog({
        event,
        details: {
          ...details,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          secureContext:
            typeof window !== "undefined" ? window.isSecureContext : false,
        },
      }).catch(() => {
        // logging is best-effort and should never block playback or navigation
      });
    },
    [],
  );

  const refreshAudioStatus = useCallback(async () => {
    setAudioLoading(true);
    try {
      const next = await fetchAudioStatus();
      setAudioStatus(next);
    } catch (error) {
      setAudioStatus(null);
      setAudioMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setAudioLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAudioStatus();
  }, [refreshAudioStatus]);

  const runAudioAction = useCallback(
    async (action: AudioAction["action"]) => {
      setAudioAction(action);
      logAudioEvent("audio_system_action_started", { action });
      try {
        const result = await postAudioAction({ action });
        setAudioMessage(result.message);
        logAudioEvent("audio_system_action_completed", {
          action,
          ok: result.ok,
          mode: result.mode,
          artifactFile: result.artifactFile,
        });
        await refreshAudioStatus();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setAudioMessage(message);
        logAudioEvent("audio_system_action_failed", { action, message });
      } finally {
        setAudioAction(null);
      }
    },
    [logAudioEvent, refreshAudioStatus],
  );

  // Refresh summaries when returning from sub-panels
  useEffect(() => {
    if (!wifiView) {
      const refresh = window.setTimeout(() => {
        void refreshWifiSummary();
      }, 0);
      return () => window.clearTimeout(refresh);
    }
    return;
  }, [refreshWifiSummary, wifiView]);

  useEffect(() => {
    if (!displayView) {
      const refresh = window.setTimeout(() => {
        void refreshDisplaySummary();
      }, 0);
      return () => window.clearTimeout(refresh);
    }
    return;
  }, [displayView, refreshDisplaySummary]);

  const wifiTap = useTap(() => setWifiView(true));
  const displayTap = useTap(() => setDisplayView(true));

  const statusSummary = useMemo(() => {
    if (backendMode === "home-assistant" && backendStatus === "ok") {
      return {
        title: "Connected",
        subtitle: lastSyncAt
          ? `Synced ${new Date(lastSyncAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : "Live state is active",
        icon: "check",
        tone: "bg-[var(--minimalist-pastel-green)] text-[var(--minimalist-pastel-green-fg)] border-[var(--minimalist-border)]",
      };
    }

    if (backendMode === "home-assistant") {
      return {
        title: backendStatus === "loading" ? "Connecting" : "Attention Needed",
        subtitle:
          errorMessage ??
          "The latest sync did not complete cleanly.",
        icon: "info",
        tone: "bg-[var(--minimalist-pastel-yellow)] text-[var(--minimalist-pastel-yellow-fg)] border-[var(--minimalist-border)]",
      };
    }

    return {
      title: "Provisioning",
      subtitle: "Pairing is not configured",
      icon: "info",
      tone: "bg-[var(--minimalist-pastel-blue)] text-[var(--minimalist-pastel-blue-fg)] border-[var(--minimalist-border)]",
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
        icon: "info",
        title: "Setup Required",
        description:
          "Home Assistant pairing is not configured yet. Use /setup to begin.",
        tone: "bg-[var(--minimalist-pastel-yellow)] text-[var(--minimalist-pastel-yellow-fg)]",
      });
    }

    if (backendMode === "demo") {
      alerts.push({
        id: "demo",
        icon: "sparkles",
        title: "Demo Mode",
        description: "Showing simulated rooms, devices, and appliances.",
        tone: "bg-[var(--minimalist-pastel-blue)] text-[var(--minimalist-pastel-blue-fg)]",
      });
    }

    return alerts;
  }, [backendMode]);

  if (wifiView) {
    return <div data-theme="minimalist" className="h-full"><WifiPanel onBack={() => setWifiView(false)} /></div>;
  }

  if (displayView) {
    return <div data-theme="minimalist" className="h-full"><DisplayPanel onBack={() => setDisplayView(false)} /></div>;
  }

  let displaySubtitle = "Loading...";
  if (displaySummary) {
    if (!displaySummary.supported) {
      displaySubtitle = "Unavailable";
    } else if (!displaySummary.screenOn) {
      displaySubtitle = "Screen off";
    } else {
      displaySubtitle = displaySummary.keepAwakeDuringDay
        ? `${displaySummary.brightnessPercent}% · day awake`
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

  const audioStatusLine = audioLoading
    ? "Checking Raspberry Pi audio services"
    : audioStatus?.supported
      ? `Backend: ${audioStatus.backend}`
      : "Preview mode — host audio unavailable on this machine";

  return (
    <div data-theme="minimalist" className="relative h-full bg-background overflow-hidden">
      <div className="corner-fade-header absolute top-0 inset-x-0 z-10 px-6 pt-8 pb-12 pointer-events-none">
        <h1 className="relative font-serif text-[32px] tracking-tight text-foreground pointer-events-auto">Settings</h1>
      </div>

      <div className="perf-scroll-region h-full space-y-12 overflow-y-auto scrollbar-hide px-6 pt-28 pb-32">
        <div className={`flex items-center gap-4 rounded-lg border px-5 py-4 ${statusSummary.tone}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-white/50">
            <Icon name={statusSummary.icon} size={16} />
          </div>
          <div>
            <p className="text-[14px] font-bold uppercase tracking-wider">{statusSummary.title}</p>
            <p className="text-[12px] opacity-80">{statusSummary.subtitle}</p>
          </div>
        </div>

        <Section title="Connectivity">
          <button
            {...wifiTap}
            className="flex w-full items-center gap-5 py-5 text-left border-b border-border"
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg border",
              wifiSummary?.wifiEnabled ? "bg-foreground text-background" : "bg-muted/5 text-muted border-border"
            )}>
              <Icon name={wifiSummary?.wifiEnabled ? "wifi" : "wifi-off"} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-foreground">Wireless Network</p>
              <p className="text-[12px] text-muted">{wifiSubtitle}</p>
            </div>
            <Icon name="chevron-right" size={16} className="text-muted" />
          </button>
          <div className="flex items-center gap-5 py-5 border-b border-border">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg border",
              wifiSummary?.ethState === "connected" ? "bg-[var(--minimalist-pastel-green)] text-[var(--minimalist-pastel-green-fg)]" : "bg-muted/5 text-muted border-border"
            )}>
              <Icon name="ethernet" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-foreground">Ethernet</p>
              <p className="text-[12px] text-muted">
                {wifiSummary?.ethState === "connected" ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
          <SettingRow
            label="Pairing status"
            value={backendMode === "home-assistant" ? "PAIRED" : "UNPAIRED"}
          />
        </Section>

        {systemAlerts.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-lg border border-border px-5 py-4 ${alert.tone}`}>
                <div className="flex items-start gap-4">
                  <Icon name={alert.icon} size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[14px] font-bold uppercase tracking-wider">{alert.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed opacity-80">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Section title="Demo Mode">
          <DemoModePanel />
        </Section>

        <Section title="Appearance">
          <SettingRow label="Dark Mode" description="Optimized for ambient display" toggle isOn={darkMode} />
          <SettingRow
            label="Notifications"
            description="Allow kiosk status prompts"
            toggle
            isOn={notifications}
            onToggle={() => setNotifications((enabled) => !enabled)}
          />
          <SettingRow label="Clock Format" value="12-HOUR" />
        </Section>

        <Section title="Panel & Display">
          <button
            {...displayTap}
            className="flex w-full items-center gap-5 py-5 text-left border-b border-border"
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg border",
              displaySummary?.screenOn ? "bg-foreground text-background" : "bg-muted/5 text-muted border-border"
            )}>
              <Icon name="power" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-foreground">Screen & brightness</p>
              <p className="text-[12px] text-muted">{displaySubtitle}</p>
            </div>
            <Icon name="chevron-right" size={16} className="text-muted" />
          </button>
          <SettingRow label="Resolution" value="800 x 480" />
        </Section>

        <Section title="Audio Configuration">
          <div className="border-b border-border py-5">
            <div className="flex items-center gap-5">
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border",
                audioStatus?.supported
                  ? "bg-foreground text-background"
                  : "bg-muted/5 text-muted border-border"
              )}>
                <Icon name="speaker" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-foreground">Host-owned audio</p>
                <p className="text-[12px] text-muted">{audioStatusLine}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-border py-6">
            <p className="text-[15px] font-medium text-foreground">Routing</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Speaker and microphone tests now run on the Raspberry Pi host instead of inside Chromium.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-border bg-muted/5 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Speaker output</p>
                <p className="mt-1 text-[13px] text-muted">
                  {audioLoading ? "Loading output route" : audioStatus?.output.label ?? "Unavailable"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/5 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Microphone input</p>
                <p className="mt-1 text-[13px] text-muted">
                  {audioLoading ? "Loading input route" : audioStatus?.input.label ?? "Unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void runAudioAction("speaker_test")}
                disabled={audioAction !== null || !audioStatus?.speakerTestAvailable}
                className="rounded-lg bg-foreground px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-background transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100"
              >
                {audioAction === "speaker_test" ? "Running..." : "Speaker test"}
              </button>
              <button
                type="button"
                onClick={() => void runAudioAction("mic_test")}
                disabled={audioAction !== null || !audioStatus?.micTestAvailable}
                className="rounded-lg border border-border px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-foreground transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100"
              >
                {audioAction === "mic_test" ? "Recording..." : "Mic test"}
              </button>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              {audioMessage ??
                "Use the host-owned speaker and mic tests to validate the kiosk audio path."}
            </p>
          </div>
        </Section>

        <Section title="Appliance Info">
          <SettingRow label="Platform" value="ARCH ARM" />
          <SettingRow label="Runtime" value="PRODUCTION" />
          <SettingRow
            label="Diagnostics"
            value={diagnostics.length > 0 ? `${diagnostics.length} ITEMS` : "CLEAR"}
          />
          <SettingRow label="Version" value="0.8.2-STABLE" />
        </Section>

        <Section title="Preview Links">
          <SettingRow label="Setup interface" value="/setup" />
          <SettingRow label="Maintenance console" value="/maintenance" />
        </Section>

        <div className="pb-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">MatterHub Utilitarian Minimalist UI</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="perf-section">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
        {title}
      </h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
