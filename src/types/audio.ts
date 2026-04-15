export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  src: string;
  accentLabel?: string;
}

export interface AudioOutputOption {
  id: string;
  label: string;
  description: string;
  source?: "system-default" | "browser";
}

export interface AudioOutputSupport {
  enumerateDevices: boolean;
  setSinkId: boolean;
  selectAudioOutput: boolean;
  secureContext: boolean;
}

export interface AudioTestLogEntry {
  event: string;
  details?: Record<string, unknown>;
}
