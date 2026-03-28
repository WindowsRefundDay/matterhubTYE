import { Scene } from "@/types";

export const scenes: Scene[] = [
  {
    id: "scene-1",
    name: "Morning",
    icon: "sunrise",
    description: "Bright lights, thermostat to 72°",
    deviceStates: {
      "dev-1": { isOn: true, value: 100 },
      "dev-4": { isOn: true, value: 100 },
      "dev-9": { isOn: true, value: 80 },
      "dev-10": { isOn: true, targetTemperature: 72 },
    },
  },
  {
    id: "scene-2",
    name: "Movie Night",
    icon: "film",
    description: "Dim lights, TV on",
    deviceStates: {
      "dev-1": { isOn: true, value: 15 },
      "dev-2": { isOn: true },
      "dev-6": { isOn: false },
      "dev-4": { isOn: false },
    },
  },
  {
    id: "scene-3",
    name: "Away",
    icon: "shield",
    description: "All off, door locked",
    deviceStates: {
      "dev-1": { isOn: false },
      "dev-2": { isOn: false },
      "dev-4": { isOn: false },
      "dev-6": { isOn: false },
      "dev-9": { isOn: false },
      "dev-14": { isOn: true, isLocked: true },
    },
  },
  {
    id: "scene-4",
    name: "Bedtime",
    icon: "moon",
    description: "Bedroom lamp dim, rest off",
    deviceStates: {
      "dev-1": { isOn: false },
      "dev-4": { isOn: false },
      "dev-6": { isOn: true, value: 20 },
      "dev-7": { isOn: true, value: 30 },
      "dev-14": { isOn: true, isLocked: true },
    },
  },
  {
    id: "scene-5",
    name: "Focus",
    icon: "brain",
    description: "Office bright, rest off",
    deviceStates: {
      "dev-9": { isOn: true, value: 100 },
      "dev-10": { isOn: true, targetTemperature: 70 },
      "dev-1": { isOn: false },
      "dev-2": { isOn: false },
    },
  },
  {
    id: "scene-6",
    name: "Dinner",
    icon: "utensils",
    description: "Kitchen bright, living room warm",
    deviceStates: {
      "dev-4": { isOn: true, value: 100 },
      "dev-1": { isOn: true, value: 50 },
      "dev-2": { isOn: false },
    },
  },
];
