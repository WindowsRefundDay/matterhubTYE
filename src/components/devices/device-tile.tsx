"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";

const deviceIcons: Record<string, string> = {
  light: "light-bulb",
  lamp: "lamp",
  thermostat: "thermometer",
  plug: "plug",
  lock: "lock",
  sensor: "sensor",
  camera: "camera",
  fan: "fan",
  tv: "tv",
  purifier: "wind",
};

function getDeviceStatus(device: Device): string {
  if (!device.isOn) return "Off";
  switch (device.type) {
    case "light":
    case "lamp":
      return device.value ? `${device.value}%` : "On";
    case "thermostat":
      return `${device.targetTemperature}°F`;
    case "fan":
    case "purifier":
      return device.value ? `${device.value}%` : "On";
    case "lock":
      return device.isLocked ? "Locked" : "Unlocked";
    case "sensor":
      return device.lastTriggered || "Active";
    case "camera":
      return "Recording";
    case "tv":
      return device.mediaTitle || "On";
    default:
      return "On";
  }
}

interface DeviceTileProps {
  device: Device;
  onToggle: () => void;
  onSelect?: () => void;
}

export function DeviceTile({ device, onToggle, onSelect }: DeviceTileProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-2xl border transition-colors",
        device.isOn
          ? "bg-accent/10 border-accent/20"
          : "bg-surface border-border/20"
      )}
    >
      <button
        onPointerDown={onToggle}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          device.isOn ? "bg-accent/20 text-accent" : "bg-surface-raised text-foreground/40"
        )}
      >
        <Icon name={deviceIcons[device.type] || "plug"} size={20} />
      </button>
      <button onPointerDown={onSelect} className="flex-1 text-left min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{device.name}</p>
        <p className={cn(
          "text-[11px] mt-0.5",
          device.isOn ? "text-accent/70" : "text-foreground/35"
        )}>
          {getDeviceStatus(device)}
        </p>
      </button>
      <button
        onPointerDown={onToggle}
        className={cn(
          "w-10 h-5 rounded-full relative shrink-0 transition-colors",
          device.isOn ? "bg-accent" : "bg-surface-raised"
        )}
      >
        <motion.div
          animate={{ x: device.isOn ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </motion.div>
  );
}
