import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): { hours: string; minutes: string; seconds: string; period: string } {
  const hours = date.getHours();
  const h12 = hours % 12 || 12;
  return {
    hours: h12.toString(),
    minutes: date.getMinutes().toString().padStart(2, "0"),
    seconds: date.getSeconds().toString().padStart(2, "0"),
    period: hours >= 12 ? "PM" : "AM",
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
