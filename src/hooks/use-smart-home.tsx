"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import type {
  SmartHomeActionRequest,
  SmartHomeDiagnostic,
  SmartHomeSnapshot,
} from "@/lib/server/ha/types";

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

interface SmartHomeRuntimeValue {
  backendStatus: "loading" | "ok" | "degraded" | "error";
  backendMode: SmartHomeSnapshot["mode"];
  diagnostics: SmartHomeDiagnostic[];
  errorMessage: string | null;
  lastSyncAt: string | null;
  refresh: () => Promise<void>;
}

interface BootstrapResponseSuccess {
  status: "ok" | "degraded";
  snapshot: SmartHomeSnapshot;
}

interface BootstrapResponseError {
  status: "error";
  error?: string;
  details?: string[];
}

type BootstrapResponse = BootstrapResponseSuccess | BootstrapResponseError;

type ActionResponse =
  | { status: "ok" }
  | { status: "error"; error?: string };

const EMPTY_DEVICES: Device[] = [];
const BOOTSTRAP_POLL_MS = 15000;

const SmartHomeAppStateContext = createContext<AppState | null>(null);
const SmartHomeStaticDataContext = createContext<SmartHomeStaticDataValue | null>(null);
const SmartHomeDeviceDataContext = createContext<SmartHomeDeviceDataValue | null>(null);
const SmartHomeActionsContext = createContext<SmartHomeActionsValue | null>(null);
const SmartHomeRuntimeContext = createContext<SmartHomeRuntimeValue | null>(null);

export function SmartHomeProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [weather, setWeather] = useState<WeatherData>(mockWeather);
  const [backendStatus, setBackendStatus] = useState<
    SmartHomeRuntimeValue["backendStatus"]
  >("loading");
  const [backendMode, setBackendMode] = useState<SmartHomeSnapshot["mode"]>("mock");
  const [diagnostics, setDiagnostics] = useState<SmartHomeDiagnostic[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>({
    mode: "ambient",
    screen: "home",
  });

  const applySnapshot = useCallback((snapshot: SmartHomeSnapshot) => {
    setDevices(snapshot.devices);
    setRooms(snapshot.rooms);
    setScenes(snapshot.scenes);
    setWeather(snapshot.weather ?? mockWeather);
    setDiagnostics(snapshot.diagnostics);
    setBackendMode(snapshot.mode);
    setLastSyncAt(snapshot.generatedAt);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/smart-home/bootstrap", {
        cache: "no-store",
      });
      const payload = (await response.json()) as BootstrapResponse;

      if (payload.status === "ok" || payload.status === "degraded") {
        applySnapshot(payload.snapshot);
        setBackendStatus(payload.status);
        setErrorMessage(null);
        return;
      }

      setBackendStatus("error");
      setErrorMessage(("error" in payload && payload.error) ? payload.error : "Failed to load smart-home snapshot.");
    } catch (error) {
      setBackendStatus("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }, [applySnapshot]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
    }, 0);

    const poll = window.setInterval(() => {
      void refresh();
    }, BOOTSTRAP_POLL_MS);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(poll);
    };
  }, [refresh]);

  const runAction = useCallback(
    async (request: SmartHomeActionRequest) => {
      const response = await fetch("/api/smart-home/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const payload = (await response.json()) as ActionResponse;
      if (!response.ok || payload.status !== "ok") {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Smart-home action failed."
        );
      }

      await refresh();
    },
    [refresh]
  );

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

  const toggleDevice = useCallback(
    (deviceId: string) => {
      const device = devices.find((item) => item.id === deviceId);
      if (!device) {
        return;
      }

      setDevices((prev) =>
        prev.map((item) =>
          item.id === deviceId ? { ...item, isOn: !item.isOn } : item
        )
      );

      void runAction({
        kind: "toggle_device",
        entityId: deviceId,
        turnOn: !device.isOn,
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        void refresh();
      });
    },
    [devices, refresh, runAction]
  );

  const setDeviceValue = useCallback(
    (deviceId: string, value: number) => {
      setDevices((prev) =>
        prev.map((item) => (item.id === deviceId ? { ...item, value } : item))
      );

      void runAction({
        kind: "set_device_value",
        entityId: deviceId,
        value,
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        void refresh();
      });
    },
    [refresh, runAction]
  );

  const setDeviceTemperature = useCallback(
    (deviceId: string, temperature: number) => {
      setDevices((prev) =>
        prev.map((item) =>
          item.id === deviceId ? { ...item, targetTemperature: temperature } : item
        )
      );

      void runAction({
        kind: "set_temperature",
        entityId: deviceId,
        temperature,
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        void refresh();
      });
    },
    [refresh, runAction]
  );

  const toggleLock = useCallback(
    (deviceId: string) => {
      const device = devices.find((item) => item.id === deviceId);
      if (!device) {
        return;
      }

      const locked = !(device.isLocked ?? true);
      setDevices((prev) =>
        prev.map((item) =>
          item.id === deviceId ? { ...item, isLocked: locked } : item
        )
      );

      void runAction({
        kind: "set_lock_state",
        entityId: deviceId,
        locked,
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        void refresh();
      });
    },
    [devices, refresh, runAction]
  );

  const activateScene = useCallback(
    (sceneId: string) => {
      void runAction({
        kind: "activate_scene",
        entityId: sceneId,
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        void refresh();
      });
    },
    [refresh, runAction]
  );

  const devicesByRoom = useMemo(() => {
    const grouped = Object.fromEntries(
      rooms.map((room) => [room.id, [] as Device[]])
    ) as Record<string, Device[]>;

    for (const device of devices) {
      if (!grouped[device.roomId]) {
        grouped[device.roomId] = [];
      }
      grouped[device.roomId].push(device);
    }

    return grouped;
  }, [devices, rooms]);

  const activeCountByRoom = useMemo(() => {
    const counts = Object.fromEntries(
      rooms.map((room) => [room.id, 0])
    ) as Record<string, number>;

    for (const device of devices) {
      if (device.isOn) {
        counts[device.roomId] = (counts[device.roomId] ?? 0) + 1;
      }
    }

    return counts;
  }, [devices, rooms]);

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
      rooms,
      scenes,
      weather,
    }),
    [rooms, scenes, weather]
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

  const runtimeValue = useMemo<SmartHomeRuntimeValue>(
    () => ({
      backendStatus,
      backendMode,
      diagnostics,
      errorMessage,
      lastSyncAt,
      refresh,
    }),
    [backendMode, backendStatus, diagnostics, errorMessage, lastSyncAt, refresh]
  );

  return (
    <SmartHomeRuntimeContext.Provider value={runtimeValue}>
      <SmartHomeStaticDataContext.Provider value={staticDataValue}>
        <SmartHomeActionsContext.Provider value={actionsValue}>
          <SmartHomeDeviceDataContext.Provider value={deviceDataValue}>
            <SmartHomeAppStateContext.Provider value={appState}>
              {children}
            </SmartHomeAppStateContext.Provider>
          </SmartHomeDeviceDataContext.Provider>
        </SmartHomeActionsContext.Provider>
      </SmartHomeStaticDataContext.Provider>
    </SmartHomeRuntimeContext.Provider>
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

export function useSmartHomeRuntime() {
  return useRequiredContext(
    SmartHomeRuntimeContext,
    "useSmartHomeRuntime"
  );
}

export function useSmartHome() {
  return {
    appState: useSmartHomeAppState(),
    ...useSmartHomeStaticData(),
    ...useSmartHomeDevices(),
    ...useSmartHomeActions(),
    runtime: useSmartHomeRuntime(),
  };
}

function useRequiredContext<T>(context: Context<T | null>, name: string) {
  const value = useContext(context);

  if (!value) {
    throw new Error(`${name} must be used within SmartHomeProvider`);
  }

  return value;
}
