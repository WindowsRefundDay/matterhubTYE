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
    <div className="relative h-full bg-background overflow-hidden">
      <div className="absolute top-0 inset-x-0 z-10 px-6 pt-8 pb-12 bg-gradient-to-b from-background via-background to-transparent pointer-events-none">
        <h1 className="font-serif text-[32px] tracking-tight text-foreground pointer-events-auto">Rooms</h1>
      </div>

      <div className="perf-scroll-region h-full space-y-12 overflow-y-auto scrollbar-hide px-6 pt-28 pb-32">
        <Section title="All Rooms">
          {rooms.map((room) => (
            <RoomTile
              key={room.id}
              room={room}
              activeCount={activeCountByRoom[room.id] ?? 0}
              onSelect={onSelectRoom}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="perf-section">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-muted border-l-2 border-foreground pl-3">
        {title}
      </h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
