"use client";

import { useSmartHomeDevices, useSmartHomeStaticData } from "@/hooks/use-smart-home";
import { RoomTile } from "./room-tile";

interface RoomListProps {
  onSelectRoom: (roomId: string) => void;
}

export function RoomList({ onSelectRoom }: RoomListProps) {
  const { rooms } = useSmartHomeStaticData();
  const { activeCountByRoom } = useSmartHomeDevices();

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-[20px] font-medium text-foreground mb-4">Rooms</h1>
      <div className="grid grid-cols-3 gap-3 flex-1">
        {rooms.map((room) => (
          <RoomTile
            key={room.id}
            room={room}
            activeCount={activeCountByRoom[room.id] ?? 0}
            onSelect={onSelectRoom}
          />
        ))}
      </div>
    </div>
  );
}
