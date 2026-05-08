import { Room } from "@/types";

export const rooms: Room[] = [
  {
    id: "room-1",
    name: "Living Room",
    icon: "sofa",
    deviceIds: ["dev-1", "dev-2", "dev-3", "dev-14", "dev-15"],
  },
  {
    id: "room-2",
    name: "Kitchen",
    icon: "chef-hat",
    deviceIds: ["dev-4", "dev-5", "dev-16", "dev-17", "dev-18"],
  },
  {
    id: "room-3",
    name: "Bedroom",
    icon: "bed",
    deviceIds: ["dev-6", "dev-7", "dev-8"],
  },
  {
    id: "room-4",
    name: "Office",
    icon: "monitor",
    deviceIds: ["dev-9", "dev-10"],
  },
  {
    id: "room-5",
    name: "Bathroom",
    icon: "bath",
    deviceIds: ["dev-11"],
  },
  {
    id: "room-6",
    name: "Garage",
    icon: "car",
    deviceIds: ["dev-12", "dev-13", "dev-21"],
  },
  {
    id: "room-7",
    name: "Laundry",
    icon: "washer",
    deviceIds: ["dev-19", "dev-20"],
  },
];
