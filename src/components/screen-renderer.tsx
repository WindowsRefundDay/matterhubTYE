"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Screen } from "@/types";
import { RoomList } from "@/components/rooms/room-list";
import { DeviceList } from "@/components/devices/device-list";
import { SceneList } from "@/components/scenes/scene-list";
import { SettingsPanel } from "@/components/settings/settings-panel";

interface ScreenRendererProps {
  screen: Screen;
  onSelectRoom: (roomId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}

export function ScreenRenderer({ screen, onSelectRoom, onSelectDevice }: ScreenRendererProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="h-full"
      >
        {screen === "rooms" && <RoomList onSelectRoom={onSelectRoom} />}
        {screen === "devices" && <DeviceList onSelectDevice={onSelectDevice} />}
        {screen === "scenes" && <SceneList />}
        {screen === "settings" && <SettingsPanel />}
      </motion.div>
    </AnimatePresence>
  );
}
