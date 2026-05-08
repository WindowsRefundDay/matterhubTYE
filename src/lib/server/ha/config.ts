import "server-only";

import { readFile } from "node:fs/promises";
import { readDemoSettings } from "./demo/settings";
import { HomeAssistantConfigError } from "./errors";
import type { HomeAssistantRuntimeConfig } from "./types";

const DEFAULT_HOME_ASSISTANT_URL = "http://127.0.0.1:8123";

async function readTokenFromFile(tokenPath: string | undefined) {
  if (!tokenPath) {
    return null;
  }

  const token = (await readFile(tokenPath, "utf8")).trim();
  return token.length > 0 ? token : null;
}

export async function loadHomeAssistantConfig(
  env: NodeJS.ProcessEnv = process.env
): Promise<HomeAssistantRuntimeConfig> {
  const errors: string[] = [];
  const backend = env.MATTERHUB_SMART_HOME_BACKEND?.trim().toLowerCase();
  const baseUrl =
    env.MATTERHUB_HOME_ASSISTANT_URL?.trim() || DEFAULT_HOME_ASSISTANT_URL;
  const tokenPath = env.MATTERHUB_HOME_ASSISTANT_TOKEN_FILE?.trim() || null;

  // Precedence: UI toggle (file) ON forces demo.
  // Otherwise env backend decides. Unset/home-assistant => home-assistant.
  const toggle = await readDemoSettings(env);

  let mode: HomeAssistantRuntimeConfig["mode"] = "home-assistant";
  if (toggle.enabled) {
    mode = "demo";
  } else if (backend === "demo" || backend === "mock") {
    mode = "demo";
  } else if (backend && backend !== "home-assistant") {
    errors.push(
      `Unsupported MATTERHUB_SMART_HOME_BACKEND value: ${env.MATTERHUB_SMART_HOME_BACKEND}`
    );
  }

  let token = env.MATTERHUB_HOME_ASSISTANT_TOKEN?.trim() || null;
  let tokenSource: HomeAssistantRuntimeConfig["tokenSource"] = token
    ? "env"
    : "none";

  if (!token && tokenPath) {
    try {
      token = await readTokenFromFile(tokenPath);
      if (token) {
        tokenSource = "file";
      } else {
        errors.push(`Token file was empty: ${tokenPath}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to read Home Assistant token file ${tokenPath}: ${message}`);
    }
  }

  if (mode === "home-assistant" && !token) {
    errors.push(
      "Missing Home Assistant token. Set MATTERHUB_HOME_ASSISTANT_TOKEN or MATTERHUB_HOME_ASSISTANT_TOKEN_FILE."
    );
  }

  return {
    mode,
    baseUrl,
    token,
    tokenSource,
    tokenPath,
    errors,
  };
}

export async function requireHomeAssistantConfig(
  env: NodeJS.ProcessEnv = process.env
) {
  const config = await loadHomeAssistantConfig(env);

  if (config.errors.length > 0) {
    throw new HomeAssistantConfigError(
      "Home Assistant runtime configuration is incomplete",
      config.errors
    );
  }

  return config;
}
