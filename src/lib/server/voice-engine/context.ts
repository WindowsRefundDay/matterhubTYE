import "server-only";

import { loadSmartHomeSnapshot } from "@/lib/server/ha";
import type { VoiceContext } from "@/lib/server/voice/executor";

export async function loadVoiceContextFromSnapshot(): Promise<VoiceContext> {
  const snapshot = await loadSmartHomeSnapshot();
  const roomMap = new Map(snapshot.rooms.map((room) => [room.id, room.name]));

  return {
    devices: snapshot.devices.map((device) => ({
      entityId: device.id,
      name: device.name,
      type: device.type,
      roomName: roomMap.get(device.roomId) ?? device.roomId,
      isOn: device.isOn,
      ...(typeof device.value === "number" ? { value: device.value } : {}),
      ...(typeof device.temperature === "number"
        ? { temperature: device.temperature }
        : {}),
      ...(typeof device.targetTemperature === "number"
        ? { targetTemperature: device.targetTemperature }
        : {}),
      ...(typeof device.isLocked === "boolean"
        ? { isLocked: device.isLocked }
        : {}),
    })),
    rooms: snapshot.rooms.map((room) => ({ id: room.id, name: room.name })),
    scenes: snapshot.scenes.map((scene) => ({
      entityId: scene.id,
      name: scene.name,
    })),
  };
}
