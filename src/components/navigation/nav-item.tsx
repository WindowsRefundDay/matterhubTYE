"use client";

import { memo } from "react";
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

export const NavItem = memo(function NavItem({
  screen,
  icon,
  label,
  isActive,
  onSelect,
}: NavItemProps) {
  return (
    <button
      onClick={() => onSelect(screen)}
      className={cn(
        "flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 transition-all duration-200",
        "active:scale-95",
        isActive
          ? "bg-foreground text-background"
          : "text-muted hover:text-foreground active:bg-muted/5"
      )}
    >
      <Icon name={icon} size={24} />
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]">{label}</span>
    </button>
  );
});
