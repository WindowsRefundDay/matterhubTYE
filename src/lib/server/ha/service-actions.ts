import type { HomeAssistantServiceCall, SmartHomeActionRequest } from "./types";

function getDomain(entityId: string) {
  return entityId.split(".", 1)[0] ?? "";
}

function toEntityTarget(entityId: string) {
  return {
    entity_id: [entityId],
  };
}

export function resolveHomeAssistantServiceCall(
  request: SmartHomeActionRequest
): HomeAssistantServiceCall {
  const domain = getDomain(request.entityId);

  switch (request.kind) {
    case "toggle_device": {
      if (["light", "switch", "fan", "camera", "media_player"].includes(domain)) {
        if (typeof request.turnOn === "boolean") {
          return {
            domain,
            service: request.turnOn ? "turn_on" : "turn_off",
            target: toEntityTarget(request.entityId),
          };
        }

        return {
          domain,
          service: "toggle",
          target: toEntityTarget(request.entityId),
        };
      }

      throw new Error(`Toggle is not supported for Home Assistant domain: ${domain}`);
    }

    case "set_device_value": {
      if (domain === "light") {
        return {
          domain,
          service: "turn_on",
          target: toEntityTarget(request.entityId),
          serviceData: {
            brightness_pct: request.value,
          },
        };
      }

      if (domain === "fan") {
        return {
          domain,
          service: "set_percentage",
          target: toEntityTarget(request.entityId),
          serviceData: {
            percentage: request.value,
          },
        };
      }

      if (domain === "media_player") {
        return {
          domain,
          service: "volume_set",
          target: toEntityTarget(request.entityId),
          serviceData: {
            volume_level: Math.max(0, Math.min(1, request.value / 100)),
          },
        };
      }

      throw new Error(`Value updates are not supported for Home Assistant domain: ${domain}`);
    }

    case "set_temperature": {
      if (domain !== "climate") {
        throw new Error(`Temperature updates require a climate entity, received: ${domain}`);
      }

      return {
        domain,
        service: "set_temperature",
        target: toEntityTarget(request.entityId),
        serviceData: {
          temperature: request.temperature,
        },
      };
    }

    case "set_lock_state": {
      if (domain !== "lock") {
        throw new Error(`Lock updates require a lock entity, received: ${domain}`);
      }

      return {
        domain,
        service: request.locked ? "lock" : "unlock",
        target: toEntityTarget(request.entityId),
      };
    }

    case "activate_scene": {
      if (domain !== "scene") {
        throw new Error(`Scene activation requires a scene entity, received: ${domain}`);
      }

      return {
        domain,
        service: "turn_on",
        target: toEntityTarget(request.entityId),
      };
    }

    default: {
      const exhaustive: never = request;
      throw new Error(`Unsupported action request: ${JSON.stringify(exhaustive)}`);
    }
  }
}
