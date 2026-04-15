"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useSmartHomeActions,
  useSmartHomeAppState,
  useSmartHomeDevices,
  useSmartHomeStaticData,
} from "@/hooks/use-smart-home";
import { useDisplayState } from "@/hooks/use-display-state";
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
import type { DisplayState, DisplayVisualPhase } from "@/types/system";

const DEFAULT_DISPLAY_STATE: DisplayState = {
  supported: false,
  screenOn: true,
  brightnessPercent: 100,
  maxBrightness: null,
  autoSleepEnabled: true,
  dimAfterSeconds: 30,
  turnOffAfterSeconds: 30,
  preferredBrightnessPercent: 100,
  dimmedBrightnessPercent: 15,
  lastOnBrightnessPercent: 100,
  keepAwakeDuringDay: false,
  dayStartsAt: "07:00",
  nightStartsAt: "22:00",
};

export function getDisplayVisualPhase(displayState: DisplayState): DisplayVisualPhase {
  if (
    displayState.supported &&
    (!displayState.screenOn || displayState.brightnessPercent <= 0)
  ) {
    return "off";
  }

  if (
    displayState.supported &&
    displayState.screenOn &&
    displayState.brightnessPercent > 0 &&
    displayState.brightnessPercent <= displayState.dimmedBrightnessPercent
  ) {
    return "mid-dim";
  }

  return "awake";
}

function parseClockMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  return hours * 60 + minutes;
}

function isWithinDayWindow(dayStartsAt: string, nightStartsAt: string, now = new Date()) {
  const start = parseClockMinutes(dayStartsAt);
  const end = parseClockMinutes(nightStartsAt);
  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) {
    return false;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

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

  const {
    data: displayStateValue,
    performAction: performDisplayAction,
  } = useDisplayState({
    initialState: DEFAULT_DISPLAY_STATE,
    pollMs: 10000,
  });
  const [minuteTick, setMinuteTick] = useState(() => Date.now());
  const displayState = displayStateValue ?? DEFAULT_DISPLAY_STATE;
  const { mode, screen, selectedRoomId, selectedDeviceId } = appState;
  const ambientVisible = mode === "ambient" || mode === "nav";
  const screenVisible = mode === "screen" || mode === "detail";
  // Keep dimming visuals cheap: the Pi may be handling a backlight command at the same time.
  const displayVisualPhase = getDisplayVisualPhase(displayState);
  const isMidDim = displayVisualPhase === "mid-dim";

  const setDisplayPower = useCallback(async (on: boolean) => {
    try {
      await performDisplayAction({ action: "set_power", on });
    } catch {
      // ignore and preserve current state
    }
  }, [performDisplayAction]);

  const setDisplayBrightness = useCallback(async (brightnessPercent: number) => {
    try {
      await performDisplayAction({
          action: "set_brightness",
          brightnessPercent,
          persist: false,
      });
    } catch {
      // ignore and preserve current state
    }
  }, [performDisplayAction]);

  useEffect(() => {
    const minuteInterval = window.setInterval(() => {
      setMinuteTick(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(minuteInterval);
    };
  }, []);

  const withinDayWindow = useMemo(
    () =>
      displayState.keepAwakeDuringDay &&
      isWithinDayWindow(displayState.dayStartsAt, displayState.nightStartsAt, new Date(minuteTick)),
    [displayState.dayStartsAt, displayState.keepAwakeDuringDay, displayState.nightStartsAt, minuteTick]
  );

  useEffect(() => {
    if (!displayState.supported) {
      return;
    }

    if (withinDayWindow) {
      const scheduleWake = window.setTimeout(() => {
        if (!displayState.screenOn) {
          void setDisplayPower(true);
        } else if (
          displayState.brightnessPercent !== displayState.preferredBrightnessPercent
        ) {
          void setDisplayBrightness(displayState.preferredBrightnessPercent);
        }
      }, 0);

      return () => {
        window.clearTimeout(scheduleWake);
      };
    }

    if (!displayState.autoSleepEnabled) {
      return;
    }

    let dimTimer: number | null = null;
    let offTimer: number | null = null;

    const armTimers = () => {
      if (dimTimer) {
        window.clearTimeout(dimTimer);
      }
      if (offTimer) {
        window.clearTimeout(offTimer);
      }

      dimTimer = window.setTimeout(() => {
        if (displayState.screenOn && !isMidDim) {
          void setDisplayBrightness(displayState.dimmedBrightnessPercent);
        }
      }, displayState.dimAfterSeconds * 1000);

      offTimer = window.setTimeout(() => {
        if (displayState.screenOn) {
          void setDisplayPower(false);
        }
      }, (displayState.dimAfterSeconds + displayState.turnOffAfterSeconds) * 1000);
    };

    const handleActivity = () => {
      if (displayState.screenOn) {
        if (isMidDim) {
          void setDisplayBrightness(displayState.preferredBrightnessPercent);
        }
        armTimers();
        return;
      }

      void setDisplayPower(true);
      armTimers();
    };

    const events = ["pointerdown", "pointermove", "keydown"] as const;
    events.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true })
    );
    armTimers();

    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity)
      );
      if (dimTimer) {
        window.clearTimeout(dimTimer);
      }
      if (offTimer) {
        window.clearTimeout(offTimer);
      }
    };
  }, [
    displayState.autoSleepEnabled,
    displayState.brightnessPercent,
    displayState.dimAfterSeconds,
    displayState.dimmedBrightnessPercent,
    displayState.preferredBrightnessPercent,
    displayState.screenOn,
    displayState.supported,
    displayState.turnOffAfterSeconds,
    isMidDim,
    setDisplayBrightness,
    setDisplayPower,
    withinDayWindow,
  ]);

  const handleAmbientTap = useCallback(() => {
    if (displayState.supported && !displayState.screenOn) {
      void setDisplayPower(true);
      return;
    }

    if (mode === "ambient") {
      setMode("nav");
    }
  }, [displayState.screenOn, displayState.supported, mode, setDisplayPower, setMode]);

  const handleIdleHome = useCallback(() => {
    goHome();
  }, [goHome]);

  useIdleTimer(handleIdleHome, 30000);

  const handleWakeTap = useCallback(() => {
    if (displayState.supported && !displayState.screenOn) {
      void setDisplayPower(true);
    }
  }, [displayState.screenOn, displayState.supported, setDisplayPower]);

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
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 transition-[background-color,opacity] duration-500 ease-out perf-panel",
          ambientVisible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        data-theme="minimalist"
        data-display-phase={displayVisualPhase}
        style={{ backgroundColor: "var(--background)" }}
        onPointerDown={ambientVisible ? handleAmbientTap : undefined}
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] grain-overlay" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,var(--minimalist-pastel-blue)_0%,transparent_50%)] opacity-[0.15]" />
        
        <AmbientClock active={ambientVisible} />
        <div className="flex flex-col items-center gap-4 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <WeatherDisplay weather={weather} />
          <StatusLine />
        </div>
      </div>

      <NavLayer
        currentScreen={screen}
        displayPhase={displayVisualPhase}
        onSelect={handleNavSelect}
      />

      <div
        data-theme="minimalist"
        className={cn(
          "absolute inset-0 z-20 flex flex-col transition-[opacity,transform] duration-200 ease-out perf-panel bg-background",
          screenVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        {screen !== "settings" && (
          <div className="absolute top-8 right-6 z-20">
            <button
              onPointerDown={goBack}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background text-muted transition-all active:scale-90"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden perf-panel">
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

      {displayState.supported && !displayState.screenOn && (
        <button
          type="button"
          aria-label="Wake display"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleWakeTap();
          }}
          className="absolute inset-0 z-50 bg-black"
        />
      )}
    </DeviceFrame>
  );
}
