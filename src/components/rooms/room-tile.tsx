"use client";

import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Room } from "@/types";
import { useTap } from "@/hooks/use-tap";

interface RoomTileProps {
  room: Room;
  activeCount: number;
  onSelect: (roomId: string) => void;
}

export const RoomTile = memo(function RoomTile({
  room,
  activeCount,
  onSelect,
}: RoomTileProps) {
  const tap = useTap(() => onSelect(room.id));

  return (
    <button
      {...tap}
      className="flex w-full items-center gap-5 py-5 text-left border-b border-border last:border-0 active:scale-[0.98] transition-transform"
    >
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg border",
        activeCount > 0 ? "bg-foreground text-background border-foreground" : "bg-muted/5 text-muted border-border"
      )}>
        <Icon name={room.icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground">{room.name}</p>
        <p className="text-[12px] text-muted">
          {activeCount > 0 ? `${activeCount} active` : "All off"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {activeCount > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--minimalist-pastel-green-fg)] bg-[var(--minimalist-pastel-green)] px-2 py-0.5 rounded-sm">
            Active
          </span>
        )}
        <Icon name="chevron-right" size={16} className="text-muted" />
      </div>
    </button>
  );
});
