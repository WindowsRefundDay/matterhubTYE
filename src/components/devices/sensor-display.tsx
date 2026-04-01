import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";

export function SensorDisplay({ device }: { device: Device }) {
  const isCamera = device.type === "camera";

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center",
        device.isOn ? "bg-accent/15 text-accent" : "bg-surface-raised text-foreground/40"
      )}>
        <Icon name={isCamera ? "camera" : "sensor"} size={28} />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-medium">{device.name}</p>
        <p className="text-[13px] text-foreground/40 mt-1">
          {isCamera
            ? device.isOn ? "Recording" : "Off"
            : device.lastTriggered
              ? `Last triggered: ${device.lastTriggered}`
              : "No activity"
          }
        </p>
      </div>
      <div className={cn(
        "px-3 py-1 rounded-full text-[11px] font-medium",
        device.isOn ? "bg-green-500/15 text-green-400" : "bg-foreground/10 text-foreground/40"
      )}>
        {device.isOn ? "Active" : "Inactive"}
      </div>
    </div>
  );
}
