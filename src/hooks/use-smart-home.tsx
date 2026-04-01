"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";
import type {
  AppMode,
  AppState,
  Device,
  Room,
  Scene,
  Screen as ScreenType,
  WeatherData,
} from "@/types";
import { initialDevices } from "@/data/devices";
import { rooms as initialRooms } from "@/data/rooms";
import { scenes as initialScenes } from "@/data/scenes";
import { mockWeather } from "@/data/weather";

interface SmartHomeStaticDataValue {
  rooms: Room[];
  scenes: Scene[];
  weather: WeatherData;
}

interface SmartHomeDeviceDataValue {
  devices: Device[];
  activeDeviceCount: number;
  activeCountByRoom: Record<string, number>;
  devicesByRoom: Record<string, Device[]>;
  getDevicesForRoom: (roomId: string) => Device[];
  getActiveCountForRoom: (roomId: string) => number;
  getDevice: (deviceId: string) => Device | undefined;
}

interface SmartHomeActionsValue {
  setMode: (mode: AppMode) => void;
  setScreen: (screen: ScreenType) => void;
  selectRoom: (roomId: string | undefined) => void;
  selectDevice: (deviceId: string | undefined) => void;
  goHome: () => void;
  goBack: () => void;
  toggleDevice: (deviceId: string) => void;
  setDeviceValue: (deviceId: string, value: number) => void;
  setDeviceTemperature: (deviceId: string, temp: number) => void;
  toggleLock: (deviceId: string) => void;
  activateScene: (sceneId: string) => void;
}

const EMPTY_DEVICES: Device[] = [];

const SmartHomeAppStateContext = createContext<AppState | null>(null);
const SmartHomeStaticDataContext = createContext<SmartHomeStaticDataValue | null>(null);
const SmartHomeDeviceDataContext = createContext<SmartHomeDeviceDataValue | null>(null);
const SmartHomeActionsContext = createContext<SmartHomeActionsValue | null>(null);

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
    setAppState((prev) => ({
      ...prev,
      mode: "screen",
      screen,
      selectedRoomId: undefined,
      selectedDeviceId: undefined,
    }));
  }, []);

  const selectRoom = useCallback((roomId: string | undefined) => {
    setAppState((prev) => ({
      ...prev,
      mode: roomId ? "detail" : "screen",
      selectedRoomId: roomId,
      selectedDeviceId: undefined,
    }));
  }, []);

  const selectDevice = useCallback((deviceId: string | undefined) => {
    setAppState((prev) => ({
      ...prev,
      mode: deviceId ? "detail" : "screen",
      selectedDeviceId: deviceId,
      selectedRoomId: undefined,
    }));
  }, []);

  const goHome = useCallback(() => {
    setAppState({
      mode: "ambient",
      screen: "home",
      selectedRoomId: undefined,
      selectedDeviceId: undefined,
    });
  }, []);

  const goBack = useCallback(() => {
    setAppState((prev) => {
      if (prev.mode === "detail") {
        return {
          ...prev,
          mode: "screen",
          selectedRoomId: undefined,
          selectedDeviceId: undefined,
        };
      }

      if (prev.mode === "screen") {
        return {
          ...prev,
          mode: "nav",
          screen: "home",
          selectedRoomId: undefined,
          selectedDeviceId: undefined,
        };
      }

      if (prev.mode === "nav") {
        return {
          ...prev,
          mode: "ambient",
          selectedRoomId: undefined,
          selectedDeviceId: undefined,
        };
      }

      return prev;
    });
  }, []);

  const toggleDevice = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, isOn: !device.isOn } : device
      )
    );
  }, []);

  const setDeviceValue = useCallback((deviceId: string, value: number) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, value } : device
      )
    );
  }, []);

  const setDeviceTemperature = useCallback((deviceId: string, temp: number) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, targetTemperature: temp } : device
      )
    );
  }, []);

  const toggleLock = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? { ...device, isLocked: !device.isLocked }
          : device
      )
    );
  }, []);

  const activateScene = useCallback((sceneId: string) => {
    const scene = initialScenes.find((item) => item.id === sceneId);
    if (!scene) return;

    setDevices((prev) =>
      prev.map((device) => {
        const nextState = scene.deviceStates[device.id];
        return nextState ? { ...device, ...nextState } : device;
      })
    );
  }, []);

  const devicesByRoom = useMemo(() => {
    const grouped = Object.fromEntries(
      initialRooms.map((room) => [room.id, [] as Device[]])
    ) as Record<string, Device[]>;

    for (const device of devices) {
      grouped[device.roomId]?.push(device);
    }

    return grouped;
  }, [devices]);

  const activeCountByRoom = useMemo(() => {
    const counts = Object.fromEntries(
      initialRooms.map((room) => [room.id, 0])
    ) as Record<string, number>;

    for (const device of devices) {
      if (device.isOn) {
        counts[device.roomId] = (counts[device.roomId] ?? 0) + 1;
      }
    }

    return counts;
  }, [devices]);

  const activeDeviceCount = useMemo(
    () => devices.reduce((count, device) => count + (device.isOn ? 1 : 0), 0),
    [devices]
  );

  const getDevicesForRoom = useCallback(
    (roomId: string) => devicesByRoom[roomId] ?? EMPTY_DEVICES,
    [devicesByRoom]
  );

  const getActiveCountForRoom = useCallback(
    (roomId: string) => activeCountByRoom[roomId] ?? 0,
    [activeCountByRoom]
  );

  const getDevice = useCallback(
    (deviceId: string) => devices.find((device) => device.id === deviceId),
    [devices]
  );

  const staticDataValue = useMemo<SmartHomeStaticDataValue>(
    () => ({
      rooms: initialRooms,
      scenes: initialScenes,
      weather: mockWeather,
    }),
    []
  );

  const deviceDataValue = useMemo<SmartHomeDeviceDataValue>(
    () => ({
      devices,
      activeDeviceCount,
      activeCountByRoom,
      devicesByRoom,
      getDevicesForRoom,
      getActiveCountForRoom,
      getDevice,
    }),
    [
      devices,
      activeDeviceCount,
      activeCountByRoom,
      devicesByRoom,
      getDevicesForRoom,
      getActiveCountForRoom,
      getDevice,
    ]
  );

  const actionsValue = useMemo<SmartHomeActionsValue>(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <SmartHomeStaticDataContext.Provider value={staticDataValue}>
      <SmartHomeActionsContext.Provider value={actionsValue}>
        <SmartHomeDeviceDataContext.Provider value={deviceDataValue}>
          <SmartHomeAppStateContext.Provider value={appState}>
            {children}
          </SmartHomeAppStateContext.Provider>
        </SmartHomeDeviceDataContext.Provider>
      </SmartHomeActionsContext.Provider>
    </SmartHomeStaticDataContext.Provider>
  );
}

export function useSmartHomeAppState() {
  return useRequiredContext(
    SmartHomeAppStateContext,
    "useSmartHomeAppState"
  );
}

export function useSmartHomeStaticData() {
  return useRequiredContext(
    SmartHomeStaticDataContext,
    "useSmartHomeStaticData"
  );
}

export function useSmartHomeDevices() {
  return useRequiredContext(
    SmartHomeDeviceDataContext,
    "useSmartHomeDevices"
  );
}

export function useSmartHomeActions() {
  return useRequiredContext(
    SmartHomeActionsContext,
    "useSmartHomeActions"
  );
}

export function useSmartHome() {
  return {
    appState: useSmartHomeAppState(),
    ...useSmartHomeStaticData(),
    ...useSmartHomeDevices(),
    ...useSmartHomeActions(),
  };
}

function useRequiredContext<T>(context: Context<T | null>, name: string) {
  const value = useContext(context);

  if (!value) {
    throw new Error(`${name} must be used within SmartHomeProvider`);
  }

  return value;
}
