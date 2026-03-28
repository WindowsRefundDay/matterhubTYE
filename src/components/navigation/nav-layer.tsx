"use client";

import { motion } from "framer-motion";
import { NavItem } from "./nav-item";
import type { Screen } from "@/types";

interface NavLayerProps {
  currentScreen: Screen;
  onSelect: (screen: Screen) => void;
}

const navItems: { screen: Screen; icon: string; label: string }[] = [
  { screen: "home", icon: "home", label: "Home" },
  { screen: "rooms", icon: "grid", label: "Rooms" },
  { screen: "devices", icon: "layers", label: "Devices" },
  { screen: "scenes", icon: "sparkles", label: "Scenes" },
  { screen: "settings", icon: "settings", label: "Settings" },
];

export function NavLayer({ currentScreen, onSelect }: NavLayerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-3xl bg-surface/80 backdrop-blur-xl border border-border/30 shadow-lg shadow-black/20">
        {navItems.map((item) => (
          <NavItem
            key={item.screen}
            screen={item.screen}
            icon={item.icon}
            label={item.label}
            isActive={currentScreen === item.screen}
            onSelect={onSelect}
          />
        ))}
      </div>
    </motion.div>
  );
}
