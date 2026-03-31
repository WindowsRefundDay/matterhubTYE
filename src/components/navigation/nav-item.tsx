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
      whileTap={{ scale: 0.9 }}
      onClick={() => onSelect(screen)}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 min-w-[56px] min-h-[56px] px-3 py-2.5 rounded-2xl transition-colors",
        isActive
          ? "bg-accent/15 text-accent"
          : "text-foreground/40 active:text-foreground/60"
      )}
    >
      <Icon name={icon} size={28} />
      <span className="text-[12px] font-medium tracking-wide">{label}</span>
    </motion.button>
  );
}
