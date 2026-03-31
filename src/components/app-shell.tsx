"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSmartHome } from "@/hooks/use-smart-home";
import { useIdleTimer } from "@/hooks/use-idle-timer";
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
  const {
    appState,
    weather,
    setMode,
    setScreen,
    selectRoom,
    selectDevice,
    goBack,
    goHome,
    getDevice,
    rooms,
  } = useSmartHome();

  const { mode, screen, selectedRoomId, selectedDeviceId } = appState;

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
    (s: Screen) => {
      if (s === "home") {
        goHome();
      } else {
        setScreen(s);
      }
    },
    [goHome, setScreen]
  );

  const selectedDevice = selectedDeviceId ? getDevice(selectedDeviceId) : undefined;
  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : undefined;

  return (
    <DeviceFrame>
      {/* Ambient gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-zinc-900/80" />

      {/* Layer 1: Ambient Clock (always rendered, fades) */}
      <AnimatePresence>
        {(mode === "ambient" || mode === "nav") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
            onPointerDown={handleAmbientTap}
          >
            <AmbientClock />
            <WeatherDisplay weather={weather} />
            <StatusLine />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer 2: Navigation drawer (always available) */}
      <AnimatePresence>
        {(mode === "ambient" || mode === "nav" || mode === "screen" || mode === "detail") && (
          <NavLayer currentScreen={screen} onSelect={handleNavSelect} />
        )}
      </AnimatePresence>

      {/* Layer 3: Screen content */}
      <AnimatePresence>
        {(mode === "screen" || mode === "detail") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <button
                onPointerDown={goBack}
                className="w-9 h-9 rounded-xl bg-surface/80 flex items-center justify-center text-foreground/50 active:scale-90 transition-transform"
              >
                <Icon name="chevron-left" size={18} />
              </button>
              <div className="flex-1" />
            </div>

            {/* Screen body */}
            <div className="flex-1 px-5 pb-20 overflow-hidden">
              <ScreenRenderer
                screen={screen}
                onSelectRoom={(id) => selectRoom(id)}
                onSelectDevice={(id) => selectDevice(id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail: Room bottom sheet */}
      <BottomSheet
        open={mode === "detail" && !!selectedRoomId}
        onClose={() => selectRoom(undefined)}
        title={selectedRoom?.name}
      >
        {selectedRoomId && <RoomDetail roomId={selectedRoomId} />}
      </BottomSheet>

      {/* Detail: Device bottom sheet */}
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
