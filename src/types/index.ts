export type DeviceType =
  | "light"
  | "lamp"
  | "thermostat"
  | "plug"
  | "lock"
  | "sensor"
  | "camera"
  | "fan"
  | "tv"
  | "purifier";

export type DeviceCategory =
  | "lights"
  | "climate"
  | "media"
  | "security"
  | "sensors"
  | "plugs";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  category: DeviceCategory;
  roomId: string;
  isOn: boolean;
  /** 0-100 for dimmable lights, volume, fan speed, etc. */
  value?: number;
  /** Temperature for thermostat */
  temperature?: number;
  targetTemperature?: number;
  /** For locks */
  isLocked?: boolean;
  /** For sensors */
  lastTriggered?: string;
  /** For media */
  mediaTitle?: string;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
  deviceIds: string[];
}

export interface Scene {
  id: string;
  name: string;
  icon: string;
  description: string;
  deviceStates: Record<string, Partial<Device>>;
}

export interface WeatherData {
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "partly-cloudy" | "clear-night";
  temperature: number;
  high: number;
  low: number;
  location: string;
}

export type AppMode = "ambient" | "nav" | "screen" | "detail";
export type Screen = "home" | "rooms" | "devices" | "scenes" | "settings";

export interface AppState {
  mode: AppMode;
  screen: Screen;
  selectedRoomId?: string;
  selectedDeviceId?: string;
}
