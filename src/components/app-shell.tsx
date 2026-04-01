"use client";

import { useCallback, useMemo } from "react";
import {
  useSmartHomeActions,
  useSmartHomeAppState,
  useSmartHomeDevices,
  useSmartHomeStaticData,
} from "@/hooks/use-smart-home";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { cn } from "@/lib/utils";
import { DeviceFrame } from "./device-frame";
import { AmbientClock } from "./ambient/ambient-clock";
import { WeatherDisplay } from "./ambient/weather-display";
import { StatusLine } from "./ambient/status-line";
import { NavLayer } from "./navigation/nav-layer";
import { ScreenRenderer } from "./screen-renderer";
import { BottomSheet } from "./ui/bottom-sheet";
import { RoomDetail } from "./rooms/room-detail";
import { DeviceControl } from "./devices/device-control";
import { Icon } from "./ui/icon";
import type { Screen } from "@/types";

export function AppShell() {
  const appState = useSmartHomeAppState();
  const { weather, rooms } = useSmartHomeStaticData();
  const { getDevice } = useSmartHomeDevices();
  const {
    setMode,
    setScreen,
    selectRoom,
    selectDevice,
    goBack,
    goHome,
  } = useSmartHomeActions();

  const { mode, screen, selectedRoomId, selectedDeviceId } = appState;
  const ambientVisible = mode === "ambient" || mode === "nav";
  const screenVisible = mode === "screen" || mode === "detail";

  const handleIdle = useCallback(() => {
    goHome();
  }, [goHome]);

  useIdleTimer(handleIdle, 30000);

  const handleAmbientTap = useCallback(() => {
    if (mode === "ambient") {
      setMode("nav");
    }
  }, [mode, setMode]);

  const handleNavSelect = useCallback(
    (nextScreen: Screen) => {
      if (nextScreen === "home") {
        goHome();
        return;
      }

      setScreen(nextScreen);
    },
    [goHome, setScreen]
  );

  const selectedDevice = useMemo(
    () => (selectedDeviceId ? getDevice(selectedDeviceId) : undefined),
    [getDevice, selectedDeviceId]
  );

  const selectedRoom = useMemo(
    () =>
      selectedRoomId
        ? rooms.find((room) => room.id === selectedRoomId)
        : undefined,
    [rooms, selectedRoomId]
  );

  return (
    <DeviceFrame>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-zinc-900/80" />

      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 transition-opacity duration-300 perf-panel",
          ambientVisible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onPointerDown={ambientVisible ? handleAmbientTap : undefined}
      >
        <AmbientClock active={ambientVisible} />
        <WeatherDisplay weather={weather} />
        <StatusLine />
      </div>

      <NavLayer currentScreen={screen} onSelect={handleNavSelect} />

      <div
        className={cn(
          "absolute inset-0 z-20 flex flex-col transition-[opacity,transform] duration-200 ease-out perf-panel",
          screenVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          <button
            onPointerDown={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/80 text-foreground/50 transition-transform active:scale-90"
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <div className="flex-1" />
        </div>

        <div className="flex-1 overflow-hidden px-5 pb-20 perf-panel">
          <ScreenRenderer
            screen={screen}
            onSelectRoom={selectRoom}
            onSelectDevice={selectDevice}
          />
        </div>
      </div>

      <BottomSheet
        open={mode === "detail" && !!selectedRoomId}
        onClose={() => selectRoom(undefined)}
        title={selectedRoom?.name}
      >
        {selectedRoomId && <RoomDetail roomId={selectedRoomId} />}
      </BottomSheet>

      <BottomSheet
        open={mode === "detail" && !!selectedDeviceId}
        onClose={() => selectDevice(undefined)}
        title={selectedDevice?.name}
      >
        {selectedDevice && <DeviceControl device={selectedDevice} />}
      </BottomSheet>
    </DeviceFrame>
  );
}
