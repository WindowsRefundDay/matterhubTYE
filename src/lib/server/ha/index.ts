import "server-only";

import { buildDemoSmartHomeSnapshot } from "./demo/snapshot";
import { readDemoSettings } from "./demo/settings";
import { buildSmartHomeSnapshot } from "./mapping";
import { loadHomeAssistantConfig, requireHomeAssistantConfig } from "./config";
import { HomeAssistantRestClient } from "./rest";
import { withHomeAssistantWebSocketClient } from "./websocket";
import type {
  HomeAssistantArea,
  HomeAssistantDeviceRecord,
  HomeAssistantEntityRegistryEntry,
} from "./types";

export async function loadSmartHomeSnapshot() {
  const demoSettings = await readDemoSettings();
  const config = demoSettings.enabled
    ? await loadHomeAssistantConfig()
    : await requireHomeAssistantConfig();

  if (config.mode === "demo" || demoSettings.enabled) {
    const snapshot = buildDemoSmartHomeSnapshot(demoSettings.enabled ? "toggle" : "env");
    
    // Merge real state into the live_demo_light placeholder (keep ID stable for room linkage)
    if (demoSettings.liveEntityId && config.token) {
      try {
        const restClient = new HomeAssistantRestClient({ ...config, token: config.token });
        const state = await restClient.getState(demoSettings.liveEntityId);
        if (state) {
          snapshot.devices = snapshot.devices.map(d => 
            d.id === "live_demo_light" ? { 
              ...d, 
              name: "Basement Light",
              isOn: state.state === "on",
              value: typeof state.attributes.brightness === "number" ? Math.round((state.attributes.brightness / 255) * 100) : d.value
            } : d
          );
        }
      } catch {
        // Fallback to purely simulated if HA is unreachable
      }
    }
    return snapshot;
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
