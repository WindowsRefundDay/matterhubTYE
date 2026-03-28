"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Screen } from "@/types";

interface NavItemProps {
  screen: Screen;
  icon: string;
  label: string;
  isActive: boolean;
  onSelect: (screen: Screen) => void;
}

export function NavItem({ screen, icon, label, isActive, onSelect }: NavItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onPointerDown={() => onSelect(screen)}
      className={cn(
        "flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-colors",
        isActive
          ? "bg-accent/15 text-accent"
          : "text-foreground/40 active:text-foreground/60"
      )}
    >
      <Icon name={icon} size={22} />
      <span className="text-[11px] font-medium tracking-wide">{label}</span>
    </motion.button>
  );
}
