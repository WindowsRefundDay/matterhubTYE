"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";
import { useSmartHomeRuntime } from "@/hooks/use-smart-home";
import { useAudioOutputDevices } from "@/hooks/use-audio-output-devices";
import { useDisplayState } from "@/hooks/use-display-state";
import { useWifiStatus } from "@/hooks/use-wifi-status";
import { useLocalAudioPlayer } from "@/hooks/use-local-audio-player";
import { postAudioTestLog } from "@/lib/client/system-api";
import { cn } from "@/lib/utils";
import { useTap } from "@/hooks/use-tap";
import { WifiPanel } from "./wifi-panel";
import { DisplayPanel } from "./display-panel";
import type { AudioOutputOption, AudioTrack } from "@/types/audio";

const AUDIO_TEST_TRACK_SRC = "/audio/showtime-reference.mp3";
const AUDIO_TEST_TRACK: AudioTrack = {
  id: "showtime-reference",
  title: "Rolling Like This",
  artist: "Don Toliver",
  src: AUDIO_TEST_TRACK_SRC,
  accentLabel: "Showtime reference",
};

export function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode] = useState(true);
  const [wifiView, setWifiView] = useState(false);
  const [displayView, setDisplayView] = useState(false);
  const [audioOutputId, setAudioOutputId] = useState<string>("system-default");
  const { backendMode, backendStatus, diagnostics, errorMessage, lastSyncAt } =
    useSmartHomeRuntime();
  const {
    outputs: audioOutputs,
    loading: audioOutputsLoading,
    support: audioSupport,
    pickBrowserOutput,
  } = useAudioOutputDevices();

  const {
    data: wifiSummary,
    refresh: refreshWifiSummary,
  } = useWifiStatus({ pollMs: 8000 });
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
          trackId: AUDIO_TEST_TRACK.id,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          secureContext:
            typeof window !== "undefined" ? window.isSecureContext : false,
          audioSupport,
        },
      }).catch(() => {
        // logging is best-effort and should never block playback or navigation
      });
    },
    [audioSupport],
  );

  const audioOutput =
    audioOutputs.find((option) => option.id === audioOutputId) ??
    audioOutputs[0] ??
    {
      id: "system-default",
      label: "System default",
      description: "Use the kiosk browser's current output route.",
      source: "system-default",
    };

  const { isPlaying, error: audioError, togglePlayPause } = useLocalAudioPlayer(
    AUDIO_TEST_TRACK,
    {
      autoPlay: false,
      outputDeviceId: audioOutput.id,
      outputLabel: audioOutput.label,
      support: audioSupport,
      logEvent: logAudioEvent,
    },
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

  const handleAudioOutputSelection = useCallback(
    (option: AudioOutputOption) => {
      setAudioOutputId(option.id);
      logAudioEvent("audio_output_selected", {
        outputId: option.id,
        outputLabel: option.label,
        source: option.source ?? "unknown",
      });
    },
    [logAudioEvent],
  );

  const handleBrowserOutputPicker = useCallback(async () => {
    try {
      const selected = await pickBrowserOutput();
      handleAudioOutputSelection(selected);
      logAudioEvent("audio_output_picker_succeeded", {
        outputId: selected.id,
        outputLabel: selected.label,
      });
    } catch (pickerError) {
      logAudioEvent("audio_output_picker_failed", {
        error: pickerError instanceof Error ? pickerError.message : String(pickerError),
      });
    }
  }, [handleAudioOutputSelection, logAudioEvent, pickBrowserOutput]);

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

    if (backendMode === "mock") {
      alerts.push({
        id: "demo",
        icon: "sparkles",
        title: "Demo Mode",
        description:
          "Currently showing mock device data.",
        tone: "bg-[var(--minimalist-pastel-blue)] text-[var(--minimalist-pastel-blue-fg)]",
      });
    }

    return alerts;
  }, [backendMode]);

  // ── Wi-Fi sub-page ──
  if (wifiView) {
    return <div data-theme="minimalist" className="h-full"><WifiPanel onBack={() => setWifiView(false)} /></div>;
  }

  if (displayView) {
    return <div data-theme="minimalist" className="h-full"><DisplayPanel onBack={() => setDisplayView(false)} /></div>;
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


  return (
    <div data-theme="minimalist" className="relative h-full bg-background overflow-hidden">
      <div className="absolute top-0 inset-x-0 z-10 px-6 pt-8 pb-12 bg-gradient-to-b from-background via-background to-transparent pointer-events-none">
        <h1 className="font-serif text-[32px] tracking-tight text-foreground pointer-events-auto">Settings</h1>
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

        <Section title="Appearance">
          <SettingRow label="Dark Mode" description="Optimized for ambient display" toggle isOn={darkMode} />
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
          <div className="flex w-full items-center gap-5 py-5 border-b border-border">
            <button
              type="button"
              onClick={() => void togglePlayPause()}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition-all active:scale-95",
                isPlaying
                  ? "bg-foreground text-background"
                  : "bg-muted/5 text-foreground border-border"
              )}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-foreground">Output Test</p>
              <p className="text-[12px] text-muted truncate">
                {audioError ?? (isPlaying ? `Playing: ${audioOutput.label}` : "Play reference track")}
              </p>
            </div>
          </div>

          <div className="py-6 border-b border-border">
            <p className="text-[15px] font-medium text-foreground">Routing</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted mb-4">
              {audioOutput.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {audioOutputs.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleAudioOutputSelection(option)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                    option.id === audioOutputId
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted border-border hover:border-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/5 px-4 py-4">
              <div className="min-w-0">
                <p className="text-[13px] font-bold uppercase tracking-wider text-foreground">System Selector</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Manual browser route selection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleBrowserOutputPicker()}
                disabled={!audioSupport.selectAudioOutput || !audioSupport.secureContext}
                className={cn(
                  "rounded-md bg-foreground px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-background transition-colors active:scale-95 disabled:opacity-30 disabled:active:scale-100"
                )}
              >
                Launch Picker
              </button>
            </div>
          </div>
        </Section>

        <Section title="Appliance Info">
          <SettingRow label="Platform" value="ARCH ARM" />
          <SettingRow label="Runtime" value="PRODUCTION" />
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
