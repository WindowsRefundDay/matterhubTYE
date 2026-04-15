"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AudioOutputOption, AudioOutputSupport } from "@/types/audio";

const SYSTEM_DEFAULT_OUTPUT: AudioOutputOption = {
  id: "system-default",
  label: "System default",
  description: "Use the kiosk browser's current output route.",
  source: "system-default",
};

function getSupport(): AudioOutputSupport {
  if (typeof window === "undefined") {
    return {
      enumerateDevices: false,
      setSinkId: false,
      selectAudioOutput: false,
      secureContext: false,
    };
  }

  const mediaDevices = navigator.mediaDevices;

  return {
    enumerateDevices: typeof mediaDevices?.enumerateDevices === "function",
    setSinkId:
      typeof HTMLMediaElement !== "undefined" &&
      typeof (
        HTMLMediaElement.prototype as HTMLMediaElement & {
          setSinkId?: (sinkId: string) => Promise<void>;
        }
      ).setSinkId === "function",
    selectAudioOutput:
      typeof mediaDevices !== "undefined" &&
      typeof (
        mediaDevices as MediaDevices & {
          selectAudioOutput?: () => Promise<MediaDeviceInfo>;
        }
      ).selectAudioOutput === "function",
    secureContext: window.isSecureContext,
  };
}

function formatOutputLabel(device: MediaDeviceInfo, index: number) {
  return device.label?.trim() || `Audio output ${index + 1}`;
}

export function useAudioOutputDevices() {
  const [outputs, setOutputs] = useState<AudioOutputOption[]>([SYSTEM_DEFAULT_OUTPUT]);
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState<AudioOutputSupport>(getSupport);

  const refresh = useCallback(async () => {
    const nextSupport = getSupport();
    setSupport(nextSupport);

    if (!nextSupport.enumerateDevices) {
      setOutputs([SYSTEM_DEFAULT_OUTPUT]);
      setLoading(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const browserOutputs = devices
        .filter((device) => device.kind === "audiooutput")
        .map((device, index) => ({
          id: device.deviceId,
          label: formatOutputLabel(device, index),
          description: device.label?.trim()
            ? "Browser-discovered output"
            : "Browser-discovered output (label hidden until browser permission is granted)",
          source: "browser" as const,
        }));

      setOutputs([
        SYSTEM_DEFAULT_OUTPUT,
        ...browserOutputs.filter((device) => device.id && device.id !== "default"),
      ]);
    } catch {
      setOutputs([SYSTEM_DEFAULT_OUTPUT]);
    } finally {
      setLoading(false);
    }
  }, []);

  const pickBrowserOutput = useCallback(async () => {
    const mediaDevices = navigator.mediaDevices as MediaDevices & {
      selectAudioOutput?: () => Promise<MediaDeviceInfo>;
    };

    if (!mediaDevices.selectAudioOutput || !window.isSecureContext) {
      throw new Error("Browser output picker is unavailable in this environment.");
    }

    const device = await mediaDevices.selectAudioOutput();
    const selected: AudioOutputOption = {
      id: device.deviceId,
      label: device.label?.trim() || "Selected browser output",
      description: "Chosen through the browser output picker",
      source: "browser",
    };

    setOutputs((current) => {
      const withoutDuplicate = current.filter((option) => option.id !== selected.id);
      return [SYSTEM_DEFAULT_OUTPUT, selected, ...withoutDuplicate.filter((option) => option.id !== SYSTEM_DEFAULT_OUTPUT.id)];
    });

    return selected;
  }, []);

  useEffect(() => {
    void refresh();

    if (!navigator.mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refresh();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refresh]);

  return useMemo(
    () => ({
      outputs,
      loading,
      support,
      refresh,
      pickBrowserOutput,
    }),
    [loading, outputs, pickBrowserOutput, refresh, support],
  );
}
