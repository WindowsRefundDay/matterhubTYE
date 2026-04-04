import "server-only";

import { HomeAssistantRequestError } from "./errors";
import type {
  HomeAssistantRuntimeConfig,
  HomeAssistantServiceCall,
  HomeAssistantState,
} from "./types";

export class HomeAssistantRestClient {
  constructor(private readonly config: HomeAssistantRuntimeConfig) {}

  async getConfig() {
    return this.request<Record<string, unknown>>("/api/");
  }

  async getStates() {
    return this.request<HomeAssistantState[]>("/api/states");
  }

  async callService(call: HomeAssistantServiceCall) {
    return this.request<unknown[]>(
      `/api/services/${call.domain}/${call.service}`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(call.target ? { target: call.target } : {}),
          ...(call.serviceData ?? {}),
        }),
      }
    );
  }

  async request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(new URL(path, this.config.baseUrl), {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new HomeAssistantRequestError(
        `Home Assistant request failed: ${response.status} ${response.statusText}`,
        response.status,
        path,
        body
      );
    }

    return (await response.json()) as T;
  }
}
