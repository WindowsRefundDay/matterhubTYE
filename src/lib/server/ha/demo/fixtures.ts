import type { Device, Room, Scene } from "@/types";

export const demoRooms: Room[] = [
  { id: "kitchen", name: "Kitchen", icon: "utensils", deviceIds: ["live_demo_light", "fridge", "coffee", "washer"] },
  { id: "living-room", name: "Living Room", icon: "monitor", deviceIds: ["tv", "main_ac"] },
  { id: "bedroom", name: "Master Bedroom", icon: "bed", deviceIds: ["bedroom_fan"] },
  { id: "garage", name: "Garage", icon: "car", deviceIds: ["garage_door"] },
];

export const demoDevices: Device[] = [
  // Kitchen
  {
    id: "live_demo_light",
    name: "Basement Light",
    type: "light",
    category: "lights",
    roomId: "kitchen",
    isOn: true,
    value: 80,
  },
  {
    id: "fridge",
    name: "Smart Fridge",
    type: "fridge",
    category: "appliances",
    roomId: "kitchen",
    isOn: true,
  },
  {
    id: "coffee",
    name: "Espresso Maker",
    type: "plug",
    category: "plugs",
    roomId: "kitchen",
    isOn: false,
  },
  
  // Living Room
  {
    id: "tv",
    name: "Living Room TV",
    type: "tv",
    category: "media",
    roomId: "living-room",
    isOn: true,
    value: 45,
    mediaTitle: "Interstellar",
  },
  {
    id: "main_ac",
    name: "Main AC",
    type: "thermostat",
    category: "climate",
    roomId: "living-room",
    isOn: true,
    temperature: 72,
    targetTemperature: 70,
  },
  
  // Bedroom
  {
    id: "bedroom_fan",
    name: "Night Fan",
    type: "fan",
    category: "climate",
    roomId: "bedroom",
    isOn: true,
    value: 50,
  },
  
  // Garage / Security
  {
    id: "garage_door",
    name: "Main Garage",
    type: "garage_door",
    category: "security",
    roomId: "garage",
    isOn: false,
  },
  {
    id: "washer",
    name: "Washing Machine",
    type: "washer",
    category: "appliances",
    roomId: "kitchen",
    isOn: true,
  },
];

export const demoScenes: Scene[] = [
  { id: "movie_night", name: "Movie Night", icon: "film", description: "Dims lights and starts TV", deviceStates: {} },
  { id: "all_off", name: "All Off", icon: "power", description: "Shutdown everything", deviceStates: {} },
];
