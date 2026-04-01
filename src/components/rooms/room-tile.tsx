"use client";

import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Room } from "@/types";

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
  const total = room.deviceIds.length;

  return (
    <button
      onPointerDown={() => onSelect(room.id)}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-surface p-4 text-left transition-[transform,background-color]",
        "active:scale-[0.98] active:bg-surface-raised"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center">
          <Icon name={room.icon} size={20} className="text-foreground/60" />
        </div>
        {activeCount > 0 && (
          <div className="w-2 h-2 rounded-full bg-accent" />
        )}
      </div>
      <div>
        <p className="text-[14px] font-medium text-foreground">{room.name}</p>
        <p className="text-[12px] text-foreground/40 mt-0.5">
          {activeCount}/{total} active
        </p>
      </div>
    </button>
  );
});
