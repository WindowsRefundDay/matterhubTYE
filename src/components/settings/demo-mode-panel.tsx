"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";

interface DemoSettingsResponse {
  status: "ok" | "error";
  settings?: { enabled: boolean; updatedAt: string | null };
  error?: string;
}

export function DemoModePanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lightIsOn, setLightIsOn] = useState(false);
  const [lightPending, setLightPending] = useState(false);
  const [lightMessage, setLightMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/demo", { cache: "no-store" });
      const body = (await res.json()) as DemoSettingsResponse;
      if (body.status !== "ok" || !body.settings) {
        throw new Error(body.error ?? "Failed to load demo settings");
      }
      setEnabled(body.settings.enabled);
      setUpdatedAt(body.settings.updatedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (enabled == null || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const body = (await res.json()) as DemoSettingsResponse;
      if (body.status !== "ok" || !body.settings) {
        throw new Error(body.error ?? "Failed to update demo settings");
      }
      setEnabled(body.settings.enabled);
      setUpdatedAt(body.settings.updatedAt);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }, [enabled, pending]);

  const description = pending
    ? "Updating..."
    : enabled == null
      ? "Loading..."
      : enabled
        ? "Simulated rooms, devices, and appliances are active. Real Home Assistant calls are skipped."
        : "Using the configured backend. Flip on to preview simulated rooms and devices.";

  const setBasementLight = useCallback(
    async (turnOn: boolean) => {
      if (lightPending) return;

      setLightIsOn(turnOn);
      setLightPending(true);
      setLightMessage(null);
      setError(null);

      try {
        await fetch("/api/smart-home/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "toggle_device",
            entityId: "live_demo_light",
            turnOn,
          }),
        });
        setLightMessage(`Basement Light turned ${turnOn ? "on" : "off"}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLightPending(false);
      }
    },
    [lightPending],
  );

  return (
    <div className="rounded-lg border border-border bg-muted/5 px-5 py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          <Icon name="sparkles" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-foreground">Demo Mode</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            {description}
          </p>
          {updatedAt && (
            <p className="mt-1 text-[11px] text-muted/70">
              Last changed {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          {error && (
            <p className="mt-2 text-[12px] text-[var(--minimalist-pastel-red-fg)]">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border">
        <SettingRow
          label="Enable demo data"
          description="Shows fake rooms, lights, climate, media, security, and appliances"
          toggle
          isOn={enabled === true}
          onToggle={toggle}
        />

        <SettingRow
          label="Basement Light direct control"
          description={
            lightPending
              ? "Sending direct command to light.basement_light..."
              : "Temporary hardcoded direct toggle for the real light.basement_light"
          }
          toggle
          isOn={lightIsOn}
          onToggle={() => void setBasementLight(!lightIsOn)}
        />
        {lightMessage && (
          <p className="pt-3 text-[12px] text-[var(--minimalist-pastel-green-fg)]">
            {lightMessage}
          </p>
        )}
      </div>
    </div>
  );
}
