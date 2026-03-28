"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { useSmartHome } from "@/hooks/use-smart-home";
import type { Room } from "@/types";

interface RoomTileProps {
  room: Room;
  onSelect: (roomId: string) => void;
}

export function RoomTile({ room, onSelect }: RoomTileProps) {
  const { getActiveCountForRoom } = useSmartHome();
  const activeCount = getActiveCountForRoom(room.id);
  const total = room.deviceIds.length;

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onPointerDown={() => onSelect(room.id)}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-border/20 text-left active:bg-surface-raised transition-colors"
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
    </motion.button>
  );
}
