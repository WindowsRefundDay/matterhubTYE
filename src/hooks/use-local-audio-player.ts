"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioOutputSupport, AudioTrack } from "@/types/audio";

type SinkAwareAudio = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
};

interface UseLocalAudioPlayerOptions {
  autoPlay?: boolean;
  outputDeviceId?: string;
  outputLabel?: string;
  support?: AudioOutputSupport;
  logEvent?: (event: string, details?: Record<string, unknown>) => void;
}

function formatTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function useLocalAudioPlayer(
  track: AudioTrack,
  {
    autoPlay = true,
    outputDeviceId = "system-default",
    outputLabel = "System default",
    support,
    logEvent,
  }: UseLocalAudioPlayerOptions = {},
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = new window.Audio(track.src) as SinkAwareAudio;
    audio.preload = "auto";
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      logEvent?.("audio_test_loaded_metadata", {
        trackId: track.id,
        duration: audio.duration,
        outputDeviceId,
        outputLabel,
      });
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      logEvent?.("audio_test_play", {
        trackId: track.id,
        currentTime: audio.currentTime,
        sinkId: audio.sinkId ?? "",
        outputDeviceId,
        outputLabel,
      });
    };
    const handlePause = () => {
      setIsPlaying(false);
      logEvent?.("audio_test_pause", {
        trackId: track.id,
        currentTime: audio.currentTime,
        sinkId: audio.sinkId ?? "",
      });
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
      logEvent?.("audio_test_ended", {
        trackId: track.id,
        duration: audio.duration,
        sinkId: audio.sinkId ?? "",
      });
    };
    const handleError = () => {
      setError("Audio test track failed to load");
      setIsPlaying(false);
      logEvent?.("audio_test_error", {
        trackId: track.id,
        sinkId: audio.sinkId ?? "",
      });
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    const configureOutput = async () => {
      const shouldUseCustomSink =
        outputDeviceId !== "system-default" &&
        typeof audio.setSinkId === "function";

      if (!shouldUseCustomSink) {
        logEvent?.("audio_test_sink_default", {
          trackId: track.id,
          outputDeviceId,
          outputLabel,
          support,
        });
        return;
      }

      try {
        await audio.setSinkId?.(outputDeviceId);
        logEvent?.("audio_test_sink_applied", {
          trackId: track.id,
          outputDeviceId,
          outputLabel,
          sinkId: audio.sinkId ?? outputDeviceId,
        });
      } catch (sinkError) {
        const message =
          sinkError instanceof Error ? sinkError.message : String(sinkError);
        setError("Selected output could not be activated. Using the browser default instead.");
        logEvent?.("audio_test_sink_failed", {
          trackId: track.id,
          outputDeviceId,
          outputLabel,
          error: message,
        });
      }
    };

    void (async () => {
      await configureOutput();

      if (!autoPlay) {
        return;
      }

      try {
        await audio.play();
      } catch {
        setError("Tap play to start the audio test");
        logEvent?.("audio_test_autoplay_blocked", {
          trackId: track.id,
          outputDeviceId,
          outputLabel,
        });
      }
    })();

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [autoPlay, logEvent, outputDeviceId, outputLabel, support, track.id, track.src]);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current as SinkAwareAudio | null;
    if (!audio) {
      return;
    }

    setError(null);

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError("Playback is blocked. Tap play again after the browser settles.");
        logEvent?.("audio_test_play_failed", {
          trackId: track.id,
          currentTime: audio.currentTime,
          outputDeviceId,
          outputLabel,
        });
      }
      return;
    }

    audio.pause();
  }, [logEvent, outputDeviceId, outputLabel, track.id]);

  const seekTo = useCallback((nextTime: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const bounded = Math.max(0, Math.min(duration || 0, nextTime));
    audio.currentTime = bounded;
    setCurrentTime(bounded);
    logEvent?.("audio_test_seek", {
      trackId: track.id,
      currentTime: bounded,
      duration,
      outputDeviceId,
      outputLabel,
    });
  }, [duration, logEvent, outputDeviceId, outputLabel, track.id]);

  const skipBy = useCallback((seconds: number) => {
    seekTo(currentTime + seconds);
  }, [currentTime, seekTo]);

  const progressPercent = useMemo(() => {
    if (duration <= 0) {
      return 0;
    }

    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  return {
    currentTime,
    duration,
    elapsedLabel: formatTime(currentTime),
    remainingLabel: `-${formatTime(Math.max(duration - currentTime, 0))}`,
    isPlaying,
    error,
    progressPercent,
    togglePlayPause,
    seekTo,
    skipBy,
  };
}
