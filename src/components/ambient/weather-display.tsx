"use client";

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
    <div className="flex items-center gap-3 text-foreground/40">
      <Icon name={weatherIcons[weather.condition]} size={22} />
      <span className="text-[18px] font-light tabular-nums">
        {weather.temperature}°
      </span>
      <span className="text-[13px] font-light text-foreground/25">
        H:{weather.high}° L:{weather.low}°
      </span>
    </div>
  );
}
