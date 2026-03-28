"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Device, Room, Scene, WeatherData, AppState, AppMode, Screen as ScreenType } from "@/types";
import { initialDevices } from "@/data/devices";
import { rooms as initialRooms } from "@/data/rooms";
import { scenes as initialScenes } from "@/data/scenes";
import { mockWeather } from "@/data/weather";

interface SmartHomeContextValue {
  // Data
  devices: Device[];
  rooms: Room[];
  scenes: Scene[];
  weather: WeatherData;

  // App state
  appState: AppState;
  setMode: (mode: AppMode) => void;
  setScreen: (screen: ScreenType) => void;
  selectRoom: (roomId: string | undefined) => void;
  selectDevice: (deviceId: string | undefined) => void;
  goHome: () => void;
  goBack: () => void;

  // Device actions
  toggleDevice: (deviceId: string) => void;
  setDeviceValue: (deviceId: string, value: number) => void;
  setDeviceTemperature: (deviceId: string, temp: number) => void;
  toggleLock: (deviceId: string) => void;

  // Scene actions
  activateScene: (sceneId: string) => void;

  // Computed
  activeDeviceCount: number;
  getDevicesForRoom: (roomId: string) => Device[];
  getActiveCountForRoom: (roomId: string) => number;
  getDevice: (deviceId: string) => Device | undefined;
}

const SmartHomeContext = createContext<SmartHomeContextValue | null>(null);

export function SmartHomeProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [appState, setAppState] = useState<AppState>({
    mode: "ambient",
    screen: "home",
  });

  const setMode = useCallback((mode: AppMode) => {
    setAppState((prev) => ({ ...prev, mode }));
  }, []);

  const setScreen = useCallback((screen: ScreenType) => {
    setAppState((prev) => ({ ...prev, mode: "screen", screen }));
  }, []);

  const selectRoom = useCallback((roomId: string | undefined) => {
    setAppState((prev) => ({
      ...prev,
      mode: roomId ? "detail" : "screen",
      selectedRoomId: roomId,
    }));
  }, []);

  const selectDevice = useCallback((deviceId: string | undefined) => {
    setAppState((prev) => ({
      ...prev,
      mode: deviceId ? "detail" : "screen",
      selectedDeviceId: deviceId,
    }));
  }, []);

  const goHome = useCallback(() => {
    setAppState({ mode: "ambient", screen: "home" });
  }, []);

  const goBack = useCallback(() => {
    setAppState((prev) => {
      if (prev.mode === "detail") {
        return { ...prev, mode: "screen", selectedRoomId: undefined, selectedDeviceId: undefined };
      }
      if (prev.mode === "screen") {
        return { ...prev, mode: "nav", screen: "home" };
      }
      if (prev.mode === "nav") {
        return { ...prev, mode: "ambient" };
      }
      return prev;
    });
  }, []);

  const toggleDevice = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, isOn: !d.isOn } : d))
    );
  }, []);

  const setDeviceValue = useCallback((deviceId: string, value: number) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, value } : d))
    );
  }, []);

  const setDeviceTemperature = useCallback((deviceId: string, temp: number) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, targetTemperature: temp } : d
      )
    );
  }, []);

  const toggleLock = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, isLocked: !d.isLocked } : d
      )
    );
  }, []);

  const activateScene = useCallback((sceneId: string) => {
    const scene = initialScenes.find((s) => s.id === sceneId);
    if (!scene) return;
    setDevices((prev) =>
      prev.map((d) => {
        const state = scene.deviceStates[d.id];
        return state ? { ...d, ...state } : d;
      })
    );
  }, []);

  const activeDeviceCount = useMemo(
    () => devices.filter((d) => d.isOn).length,
    [devices]
  );

  const getDevicesForRoom = useCallback(
    (roomId: string) => {
      const room = initialRooms.find((r) => r.id === roomId);
      if (!room) return [];
      return devices.filter((d) => room.deviceIds.includes(d.id));
    },
    [devices]
  );

  const getActiveCountForRoom = useCallback(
    (roomId: string) => {
      return getDevicesForRoom(roomId).filter((d) => d.isOn).length;
    },
    [getDevicesForRoom]
  );

  const getDevice = useCallback(
    (deviceId: string) => devices.find((d) => d.id === deviceId),
    [devices]
  );

  const value = useMemo<SmartHomeContextValue>(
    () => ({
      devices,
      rooms: initialRooms,
      scenes: initialScenes,
      weather: mockWeather,
      appState,
      setMode,
      setScreen,
      selectRoom,
      selectDevice,
      goHome,
      goBack,
      toggleDevice,
      setDeviceValue,
      setDeviceTemperature,
      toggleLock,
      activateScene,
      activeDeviceCount,
      getDevicesForRoom,
      getActiveCountForRoom,
      getDevice,
    }),
    [devices, appState, setMode, setScreen, selectRoom, selectDevice, goHome, goBack, toggleDevice, setDeviceValue, setDeviceTemperature, toggleLock, activateScene, activeDeviceCount, getDevicesForRoom, getActiveCountForRoom, getDevice]
  );

  return (
    <SmartHomeContext.Provider value={value}>
      {children}
    </SmartHomeContext.Provider>
  );
}

export function useSmartHome() {
  const ctx = useContext(SmartHomeContext);
  if (!ctx) throw new Error("useSmartHome must be used within SmartHomeProvider");
  return ctx;
}
