import "server-only";

import { buildMockSmartHomeSnapshot } from "./mock";
import { buildSmartHomeSnapshot } from "./mapping";
import { requireHomeAssistantConfig } from "./config";
import { HomeAssistantRestClient } from "./rest";
import { withHomeAssistantWebSocketClient } from "./websocket";
import type {
  HomeAssistantArea,
  HomeAssistantDeviceRecord,
  HomeAssistantEntityRegistryEntry,
} from "./types";

export async function loadSmartHomeSnapshot() {
  const config = await requireHomeAssistantConfig();

  if (config.mode === "mock") {
    return buildMockSmartHomeSnapshot();
  }

  const restClient = new HomeAssistantRestClient(config);
  const states = await restClient.getStates();

  const registryData = await withHomeAssistantWebSocketClient(config, async (client) => {
    const [areas, devices, entityRegistry] = await Promise.all([
      client.command<HomeAssistantArea[]>("config/area_registry/list"),
      client.command<HomeAssistantDeviceRecord[]>("config/device_registry/list"),
      client.command<HomeAssistantEntityRegistryEntry[]>("config/entity_registry/list"),
    ]);

    return { areas, devices, entityRegistry };
  });

  return buildSmartHomeSnapshot(
    {
      states,
      areas: registryData.areas,
      devices: registryData.devices,
      entityRegistry: registryData.entityRegistry,
    },
    config.mode
  );
}

export async function validateHomeAssistantConnection(
  baseUrl?: string,
  token?: string
) {
  const config = await requireHomeAssistantConfig(
    baseUrl || token
      ? {
          ...process.env,
          MATTERHUB_HOME_ASSISTANT_URL: baseUrl ?? process.env.MATTERHUB_HOME_ASSISTANT_URL,
          MATTERHUB_HOME_ASSISTANT_TOKEN: token ?? process.env.MATTERHUB_HOME_ASSISTANT_TOKEN,
        }
      : process.env
  );

  const restClient = new HomeAssistantRestClient(config);
  const apiRoot = await restClient.getConfig();

  const areas = await withHomeAssistantWebSocketClient(config, (client) =>
    client.command<HomeAssistantArea[]>("config/area_registry/list")
  );

  return {
    baseUrl: config.baseUrl,
    version:
      typeof apiRoot.version === "string" ? apiRoot.version : null,
    locationName:
      typeof apiRoot.location_name === "string" ? apiRoot.location_name : null,
    areaCount: areas.length,
    tokenSource: config.tokenSource,
  };
}
