"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SettingRow } from "./setting-row";

export function SettingsPanel() {
  const [autoSleep, setAutoSleep] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode] = useState(true);

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-[20px] font-medium text-foreground mb-4">Settings</h1>
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-5">
        {/* Connection Status */}
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-4 py-3 flex items-center gap-3">
          <Icon name="wifi" size={18} className="text-green-400" />
          <div>
            <p className="text-[13px] font-medium text-green-400">Connected</p>
            <p className="text-[11px] text-green-400/60">Home Assistant · 192.168.1.100</p>
          </div>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow label="Dark Mode" description="Always on for ambient display" toggle isOn={darkMode} />
          <SettingRow label="Accent Color" value="Amber" />
          <SettingRow label="Clock Format" value="12-hour" />
        </Section>

        {/* Display */}
        <Section title="Display">
          <SettingRow label="Auto Sleep" description="Dim after 5 minutes" toggle isOn={autoSleep} onToggle={() => setAutoSleep(!autoSleep)} />
          <SettingRow label="Brightness" value="80%" />
          <SettingRow label="Idle Timeout" value="30 seconds" />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow label="Show Alerts" description="Motion, door events" toggle isOn={notifications} onToggle={() => setNotifications(!notifications)} />
        </Section>

        {/* System */}
        <Section title="System">
          <SettingRow label="Version" value="1.0.0" />
          <SettingRow label="Device" value="MatterHub 5" />
          <SettingRow label="Resolution" value="800 x 480" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13px] font-medium text-foreground/40 uppercase tracking-wider mb-1">
        {title}
      </h2>
      <div className="divide-y divide-border/20">
        {children}
      </div>
    </div>
  );
}
