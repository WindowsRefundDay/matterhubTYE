"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";

const SYSTEM_ALERTS = [
  {
    id: "setup",
    icon: "wifi",
    title: "Setup required",
    description: "Home Assistant pairing is not configured yet. Use /setup for the first-boot Wi-Fi and token flow.",
    tone: "text-amber-200 border-amber-500/25 bg-amber-500/10",
  },
  {
    id: "demo",
    icon: "info",
    title: "Demo fixtures still active",
    description: "The current UI is still powered by mock device data until the HA backend lane lands production data sources.",
    tone: "text-sky-100 border-sky-500/25 bg-sky-500/10",
  },
] as const;

export function SettingsPanel() {
  const [autoSleep, setAutoSleep] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode] = useState(true);

  const statusSummary = useMemo(
    () => ({
      title: "Awaiting appliance provisioning",
      subtitle: "MatterHub has not been paired with Home Assistant yet",
      icon: "wifi-off",
      tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    }),
    []
  );

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
          <SettingRow label="Pairing status" value="Not paired" />
        </Section>

        <div className="space-y-3">
          {SYSTEM_ALERTS.map((alert) => (
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

        <Section title="System">
          <SettingRow label="Runtime mode" value="Preview / mock data" />
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
