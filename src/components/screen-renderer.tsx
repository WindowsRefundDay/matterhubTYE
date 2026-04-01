"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Screen } from "@/types";
import { RoomList } from "@/components/rooms/room-list";
import { DeviceList } from "@/components/devices/device-list";
import { SceneList } from "@/components/scenes/scene-list";
import { SettingsPanel } from "@/components/settings/settings-panel";

interface ScreenRendererProps {
  screen: Screen;
  onSelectRoom: (roomId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}

type TransitionPhase = "idle" | "exit" | "enter";

const TRANSITION_MS = 140;

export function ScreenRenderer({
  screen,
  onSelectRoom,
  onSelectDevice,
}: ScreenRendererProps) {
  const [displayedScreen, setDisplayedScreen] = useState(screen);
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  useEffect(() => {
    if (screen === displayedScreen) {
      return;
    }

    const skipExit = displayedScreen === "home";
    const exitTimer = window.setTimeout(() => {
      if (!skipExit) {
        setPhase("exit");
      }
    }, 0);

    const swapTimer = window.setTimeout(() => {
      setDisplayedScreen(screen);
      setPhase("enter");
    }, skipExit ? 0 : TRANSITION_MS);

    const settleTimer = window.setTimeout(() => {
      setPhase("idle");
    }, skipExit ? TRANSITION_MS : TRANSITION_MS * 2);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [displayedScreen, screen]);

  return (
    <div
      className={cn(
        "h-full perf-panel transition-[opacity,transform] duration-150 ease-out",
        phase === "exit" ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
      )}
    >
      {displayedScreen === "rooms" && <RoomList onSelectRoom={onSelectRoom} />}
      {displayedScreen === "devices" && (
        <DeviceList onSelectDevice={onSelectDevice} />
      )}
      {displayedScreen === "scenes" && <SceneList />}
      {displayedScreen === "settings" && <SettingsPanel />}
    </div>
  );
}
