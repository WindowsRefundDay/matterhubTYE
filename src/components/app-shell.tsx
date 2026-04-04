"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface DisplayControlState {
  supported: boolean;
  screenOn: boolean;
  brightnessPercent: number;
  autoSleepEnabled: boolean;
  dimAfterSeconds: number;
  turnOffAfterSeconds: number;
  preferredBrightnessPercent: number;
  dimmedBrightnessPercent: number;
  lastOnBrightnessPercent: number;
  keepAwakeDuringDay: boolean;
  dayStartsAt: string;
  nightStartsAt: string;
}

const DEFAULT_DISPLAY_STATE: DisplayControlState = {
  supported: false,
  screenOn: true,
  brightnessPercent: 100,
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

  const [displayState, setDisplayState] = useState<DisplayControlState>(DEFAULT_DISPLAY_STATE);
  const [minuteTick, setMinuteTick] = useState(() => Date.now());
  const { mode, screen, selectedRoomId, selectedDeviceId } = appState;
  const ambientVisible = mode === "ambient" || mode === "nav";
  const screenVisible = mode === "screen" || mode === "detail";

  const fetchDisplayState = useCallback(async () => {
    try {
      const response = await fetch("/api/system/display", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as DisplayControlState;
      setDisplayState(payload);
    } catch {
      // non-critical; preserve the last known display state
    }
  }, []);

  const setDisplayPower = useCallback(async (on: boolean) => {
    try {
      const response = await fetch("/api/system/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_power", on }),
      });

      if (response.ok) {
        const payload = (await response.json()) as DisplayControlState;
        setDisplayState(payload);
      }
    } catch {
      // ignore and preserve current state
    }
  }, []);

  const setDisplayBrightness = useCallback(async (brightnessPercent: number) => {
    try {
      const response = await fetch("/api/system/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_brightness",
          brightnessPercent,
          persist: false,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as DisplayControlState;
        setDisplayState(payload);
      }
    } catch {
      // ignore and preserve current state
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void fetchDisplayState();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchDisplayState();
    }, 10000);

    const minuteInterval = window.setInterval(() => {
      setMinuteTick(Date.now());
    }, 60000);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.clearInterval(minuteInterval);
    };
  }, [fetchDisplayState]);

  const withinDayWindow = useMemo(
    () =>
      displayState.keepAwakeDuringDay &&
      isWithinDayWindow(displayState.dayStartsAt, displayState.nightStartsAt, new Date(minuteTick)),
    [displayState.dayStartsAt, displayState.keepAwakeDuringDay, displayState.nightStartsAt, minuteTick]
  );

  const isDimmed =
    displayState.screenOn &&
    displayState.brightnessPercent > 0 &&
    displayState.brightnessPercent <= displayState.dimmedBrightnessPercent;

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
        if (displayState.screenOn && !isDimmed) {
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
        if (isDimmed) {
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
    isDimmed,
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
