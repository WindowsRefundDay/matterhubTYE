"use client";

import { useSmartHome } from "@/hooks/use-smart-home";
import { DeviceTile } from "@/components/devices/device-tile";
import { EmptyState } from "@/components/ui/empty-state";

interface RoomDetailProps {
  roomId: string;
}

export function RoomDetail({ roomId }: RoomDetailProps) {
  const { rooms, getDevicesForRoom, toggleDevice, selectDevice } = useSmartHome();
  const room = rooms.find((r) => r.id === roomId);
  const devices = getDevicesForRoom(roomId);

  if (!room) return null;

  if (devices.length === 0) {
    return <EmptyState icon="info" title="No devices" description="This room has no devices yet." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {devices.map((device) => (
        <DeviceTile
          key={device.id}
          device={device}
          onToggle={() => toggleDevice(device.id)}
          onSelect={() => selectDevice(device.id)}
        />
      ))}
    </div>
  );
}
