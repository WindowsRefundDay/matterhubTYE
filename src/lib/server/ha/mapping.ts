import type { Device, DeviceCategory, DeviceType, Room, Scene, WeatherData } from "@/types";
import type {
  HomeAssistantArea,
  HomeAssistantBootstrapSource,
  HomeAssistantEntityRegistryEntry,
  HomeAssistantState,
  SmartHomeDiagnostic,
  SmartHomeEntityReference,
  SmartHomeSnapshot,
} from "./types";

const SUPPORTED_DOMAINS = new Set([
  "light",
  "switch",
  "climate",
  "fan",
  "lock",
  "sensor",
  "binary_sensor",
  "camera",
  "media_player",
]);

const OFF_STATES = new Set([
  "off",
  "unavailable",
  "unknown",
  "standby",
  "idle",
  "closed",
  "locked",
  "paused",
]);

const ROOM_ICON_RULES: Array<[RegExp, string]> = [
  [/living/i, "sofa"],
  [/kitchen/i, "chef-hat"],
  [/bed/i, "bed"],
  [/office/i, "monitor"],
  [/bath/i, "bath"],
  [/garage/i, "car"],
  [/hall|entry|foyer/i, "door-open"],
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unassigned";
}

function getDomain(entityId: string) {
  return entityId.split(".", 1)[0] ?? "unknown";
}

function getFriendlyName(state: HomeAssistantState) {
  const friendlyName = state.attributes.friendly_name;
  if (typeof friendlyName === "string" && friendlyName.trim()) {
    return friendlyName.trim();
  }

  return state.entity_id
    .split(".")[1]
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || state.entity_id;
}

function getRoomNameFromArea(area: HomeAssistantArea | undefined, state: HomeAssistantState) {
  if (area?.name) {
    return area.name;
  }

  const areaName = state.attributes.area_name;
  if (typeof areaName === "string" && areaName.trim()) {
    return areaName.trim();
  }

  return "Unassigned";
}

function getRoomIcon(roomName: string) {
  return ROOM_ICON_RULES.find(([pattern]) => pattern.test(roomName))?.[1] ?? "home";
}

function toPercentage(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  return undefined;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isDeviceOn(state: HomeAssistantState, domain: string) {
  if (domain === "lock") {
    return state.state !== "unavailable" && state.state !== "unknown";
  }

  return !OFF_STATES.has(state.state);
}

function mapDeviceKind(state: HomeAssistantState, domain: string): {
  type: DeviceType;
  category: DeviceCategory;
  supportedActions: string[];
} | null {
  const name = getFriendlyName(state).toLowerCase();
  const deviceClass =
    typeof state.attributes.device_class === "string"
      ? state.attributes.device_class.toLowerCase()
      : "";

  switch (domain) {
    case "light":
      return {
        type: name.includes("lamp") ? "lamp" : "light",
        category: "lights",
        supportedActions: ["toggle_device", "set_device_value"],
      };
    case "switch":
      if (name.includes("purifier") || deviceClass === "air_purifier") {
        return {
          type: "purifier",
          category: "climate",
          supportedActions: ["toggle_device", "set_device_value"],
        };
      }

      return {
        type: "plug",
        category: "plugs",
        supportedActions: ["toggle_device"],
      };
    case "climate":
      return {
        type: "thermostat",
        category: "climate",
        supportedActions: ["set_temperature"],
      };
    case "fan":
      return {
        type: "fan",
        category: "climate",
        supportedActions: ["toggle_device", "set_device_value"],
      };
    case "lock":
      return {
        type: "lock",
        category: "security",
        supportedActions: ["set_lock_state"],
      };
    case "sensor":
    case "binary_sensor":
      return {
        type: "sensor",
        category: "sensors",
        supportedActions: [],
      };
    case "camera":
      return {
        type: "camera",
        category: "security",
        supportedActions: ["toggle_device"],
      };
    case "media_player":
      return {
        type: "tv",
        category: "media",
        supportedActions: ["toggle_device", "set_device_value"],
      };
    default:
      return null;
  }
}

function buildDevice(state: HomeAssistantState, roomId: string, domain: string) {
  const mapped = mapDeviceKind(state, domain);
  if (!mapped) {
    return null;
  }

  const percentage = toPercentage(
    state.attributes.brightness_pct ??
      state.attributes.percentage ??
      (typeof state.attributes.volume_level === "number"
        ? state.attributes.volume_level * 100
        : undefined)
  );

  const device: Device = {
    id: state.entity_id,
    name: getFriendlyName(state),
    type: mapped.type,
    category: mapped.category,
    roomId,
    isOn: isDeviceOn(state, domain),
  };

  if (percentage !== undefined) {
    device.value = percentage;
  }

  const currentTemperature = toNumber(state.attributes.current_temperature);
  if (currentTemperature !== undefined) {
    device.temperature = currentTemperature;
  }

  const targetTemperature = toNumber(state.attributes.temperature);
  if (targetTemperature !== undefined) {
    device.targetTemperature = targetTemperature;
  }

  if (mapped.type === "lock") {
    device.isLocked = state.state === "locked";
  }

  if (mapped.type === "sensor") {
    if (typeof state.attributes.unit_of_measurement === "string") {
      device.lastTriggered = `${state.state}${state.attributes.unit_of_measurement}`;
    } else if (typeof state.attributes.device_class === "string") {
      device.lastTriggered = state.state.replace(/_/g, " ");
    } else {
      device.lastTriggered = state.state;
    }
  }

  if (mapped.type === "tv") {
    const mediaTitle = state.attributes.media_title;
    if (typeof mediaTitle === "string" && mediaTitle.trim()) {
      device.mediaTitle = mediaTitle.trim();
    }
  }

  return {
    device,
    reference: {
      entityId: state.entity_id,
      domain,
      deviceId: state.entity_id,
      roomId,
      supportedActions: mapped.supportedActions,
    } satisfies SmartHomeEntityReference,
  };
}

function buildWeather(states: HomeAssistantState[]): WeatherData | null {
  const weatherState = states.find((state) => getDomain(state.entity_id) === "weather");
  if (!weatherState) {
    return null;
  }

  const condition = weatherState.state;
  const temperature = toNumber(weatherState.attributes.temperature);
  const high = toNumber(weatherState.attributes.forecast_high ?? weatherState.attributes.temperature);
  const low = toNumber(weatherState.attributes.forecast_low ?? weatherState.attributes.temperature);
  const location =
    typeof weatherState.attributes.friendly_name === "string"
      ? weatherState.attributes.friendly_name
      : "Home";

  if (temperature === undefined || high === undefined || low === undefined) {
    return null;
  }

  const normalizedCondition: WeatherData["condition"] =
    condition === "clear-night"
      ? "clear-night"
      : condition === "sunny" || condition === "cloudy" || condition === "rainy" || condition === "snowy"
        ? condition
        : "partly-cloudy";

  return {
    condition: normalizedCondition,
    temperature,
    high,
    low,
    location,
  };
}

function buildRoomLookup(areas: HomeAssistantArea[] | undefined) {
  return new Map((areas ?? []).map((area) => [area.area_id, area]));
}

function buildEntityRegistryLookup(entries: HomeAssistantEntityRegistryEntry[] | undefined) {
  return new Map((entries ?? []).map((entry) => [entry.entity_id, entry]));
}

export function buildSmartHomeSnapshot(
  source: HomeAssistantBootstrapSource,
  mode: SmartHomeSnapshot["mode"] = "home-assistant"
): SmartHomeSnapshot {
  const diagnostics: SmartHomeDiagnostic[] = [];
  const devices: Device[] = [];
  const scenes: Scene[] = [];
  const entityReferences: Record<string, SmartHomeEntityReference> = {};
  const roomsById = new Map<string, Room>();

  const areaLookup = buildRoomLookup(source.areas);
  const entityRegistryLookup = buildEntityRegistryLookup(source.entityRegistry);

  for (const state of source.states) {
    const domain = getDomain(state.entity_id);

    if (domain === "scene") {
      scenes.push({
        id: state.entity_id,
        name: getFriendlyName(state),
        icon: "sparkles",
        description:
          typeof state.attributes.friendly_name === "string"
            ? `${state.attributes.friendly_name} scene`
            : "Home Assistant scene",
        deviceStates: {},
      });
      continue;
    }

    if (domain === "weather") {
      continue;
    }

    if (!SUPPORTED_DOMAINS.has(domain)) {
      diagnostics.push({
        level: "info",
        code: "unsupported_domain",
        entityId: state.entity_id,
        message: `Ignoring unsupported Home Assistant domain: ${domain}`,
      });
      continue;
    }

    const registryEntry = entityRegistryLookup.get(state.entity_id);
    if (registryEntry?.disabled_by || registryEntry?.hidden_by) {
      diagnostics.push({
        level: "info",
        code: "hidden_entity",
        entityId: state.entity_id,
        message: "Ignoring entity hidden or disabled in Home Assistant registry",
      });
      continue;
    }

    const roomAreaId =
      registryEntry?.area_id ||
      (typeof state.attributes.area_id === "string" ? state.attributes.area_id : undefined);
    const roomArea = roomAreaId ? areaLookup.get(roomAreaId) : undefined;
    const roomName = getRoomNameFromArea(roomArea, state);
    const roomId = roomAreaId || `room-${slugify(roomName)}`;

    if (!roomsById.has(roomId)) {
      roomsById.set(roomId, {
        id: roomId,
        name: roomName,
        icon: getRoomIcon(roomName),
        deviceIds: [],
      });
    }

    const built = buildDevice(state, roomId, domain);
    if (!built) {
      diagnostics.push({
        level: "warn",
        code: "unmapped_entity",
        entityId: state.entity_id,
        message: "Entity used a supported domain but could not be mapped to a MatterHub device",
      });
      continue;
    }

    devices.push(built.device);
    roomsById.get(roomId)?.deviceIds.push(built.device.id);
    entityReferences[built.device.id] = built.reference;
  }

  if (devices.length === 0) {
    diagnostics.push({
      level: "warn",
      code: "no_devices",
      message: "No supported Home Assistant devices were mapped into the MatterHub snapshot",
    });
  }

  return {
    mode,
    generatedAt: new Date().toISOString(),
    rooms: Array.from(roomsById.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    devices: devices.sort((left, right) => left.name.localeCompare(right.name)),
    scenes: scenes.sort((left, right) => left.name.localeCompare(right.name)),
    weather: buildWeather(source.states),
    diagnostics,
    entityReferences,
  };
}
