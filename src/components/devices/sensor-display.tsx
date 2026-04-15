import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";

export function SensorDisplay({ device }: { device: Device }) {
  const isCamera = device.type === "camera";

  return (
    <div data-theme="minimalist" className="flex flex-col items-center gap-6 py-8">
      <div className={cn(
        "w-20 h-20 rounded-2xl flex items-center justify-center border transition-all",
        device.isOn 
          ? "bg-[var(--minimalist-pastel-blue)] text-[var(--minimalist-pastel-blue-fg)] border-[var(--minimalist-pastel-blue-fg)]/20" 
          : "bg-muted/5 text-muted border-border"
      )}>
        <Icon name={isCamera ? "camera" : "sensor"} size={32} />
      </div>
      
      <div className="text-center">
        <h3 className="text-[16px] font-medium tracking-tight text-foreground">{device.name}</h3>
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-muted mt-2">
          {isCamera
            ? device.isOn ? "Live Monitoring" : "Feed Standby"
            : device.isOn ? "Actuated" : "Idle"
          }
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 mt-2">
        <div className={cn(
          "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
          device.isOn 
            ? "bg-[var(--minimalist-pastel-green)] text-[var(--minimalist-pastel-green-fg)]" 
            : "bg-muted/10 text-muted"
        )}>
          {device.isOn ? "Active" : "Inactive"}
        </div>
        {!isCamera && device.lastTriggered && (
          <p className="text-[10px] font-mono text-muted mt-2">
            Last: {device.lastTriggered}
          </p>
        )}
      </div>
    </div>
  );
}
