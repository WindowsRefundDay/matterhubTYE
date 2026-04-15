import { Icon } from "@/components/ui/icon";
import { WeatherData } from "@/types";

const weatherIcons: Record<WeatherData["condition"], string> = {
  sunny: "sun",
  cloudy: "cloud",
  rainy: "cloud-rain",
  snowy: "snowflake",
  "partly-cloudy": "cloud-sun",
  "clear-night": "moon",
};

export function WeatherDisplay({ weather }: { weather: WeatherData }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/5 text-foreground">
        <Icon name={weatherIcons[weather.condition]} size={20} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[28px] leading-tight text-foreground tabular-nums">
            {weather.temperature}°
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
            Celsius
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted/60">
            High {weather.high}°
          </span>
          <div className="h-1 w-1 rounded-full bg-border" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted/60">
            Low {weather.low}°
          </span>
        </div>
      </div>
    </div>
  );
}
