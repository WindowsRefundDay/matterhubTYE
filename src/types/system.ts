// ---------------------------------------------------------------------------
// Display subsystem
// ---------------------------------------------------------------------------

export interface DisplayState {
  supported: boolean;
  screenOn: boolean;
  brightnessPercent: number;
  maxBrightness: number | null;
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

export interface DisplaySettings {
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

export type DisplayAction =
  | { action: "set_brightness"; brightnessPercent: number; persist?: boolean }
  | { action: "set_power"; on: boolean }
  | { action: "set_auto_sleep"; enabled: boolean }
  | { action: "set_dim_after"; dimAfterSeconds: number }
  | { action: "set_turn_off_after"; turnOffAfterSeconds: number }
  | { action: "set_dimmed_brightness"; dimmedBrightnessPercent: number }
  | { action: "set_keep_awake_during_day"; enabled: boolean }
  | { action: "set_day_window"; dayStartsAt: string; nightStartsAt: string };

// ---------------------------------------------------------------------------
// WiFi subsystem
// ---------------------------------------------------------------------------

export interface WifiNetwork {
  ssid: string;
  signal: number;
  security: string;
  inUse: boolean;
}

export interface WifiConnectionDetails {
  ssid: string;
  ip: string;
  gateway: string;
  dns: string;
  security: string;
  signal: number;
  frequency: string;
  linkSpeed: string;
  macAddress: string;
}

export interface WifiStatus {
  wifiEnabled: boolean;
  wlanState: string;
  wlanConnection: string | null;
  ethState: string;
  connectionDetails: WifiConnectionDetails | null;
  networks: WifiNetwork[];
}

export type WifiAction =
  | { action: "toggle" }
  | { action: "connect"; ssid: string; password?: string }
  | { action: "disconnect" }
  | { action: "forget"; ssid: string };
