import "server-only";

import { HomeAssistantWebSocketError } from "./errors";
import type { HomeAssistantRuntimeConfig } from "./types";

type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

type WebSocketResult<T> = {
  id?: number;
  type: string;
  success?: boolean;
  result?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

function toWebSocketUrl(baseUrl: string) {
  const url = new URL("/api/websocket", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export class HomeAssistantWebSocketClient {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, Deferred<unknown>>();

  constructor(private readonly config: HomeAssistantRuntimeConfig) {}

  async connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (typeof WebSocket !== "function") {
      throw new HomeAssistantWebSocketError(
        "Global WebSocket client is unavailable in this runtime"
      );
    }

    const socket = new WebSocket(toWebSocketUrl(this.config.baseUrl));
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener("message", onMessage);
        socket.removeEventListener("error", onError);
        socket.removeEventListener("close", onClose);
      };

      const onError = () => {
        cleanup();
        reject(new HomeAssistantWebSocketError("WebSocket connection failed"));
      };

      const onClose = () => {
        cleanup();
        reject(new HomeAssistantWebSocketError("WebSocket closed during auth"));
      };

      const onMessage = (event: MessageEvent<string>) => {
        const payload = JSON.parse(event.data) as WebSocketResult<unknown>;

        if (payload.type === "auth_required") {
          socket.send(
            JSON.stringify({
              type: "auth",
              access_token: this.config.token,
            })
          );
          return;
        }

        if (payload.type === "auth_ok") {
          cleanup();
          socket.addEventListener("message", this.handleMessage);
          socket.addEventListener("close", this.handleClose);
          resolve();
          return;
        }

        if (payload.type === "auth_invalid") {
          cleanup();
          reject(
            new HomeAssistantWebSocketError(
              payload.error?.message || "Home Assistant WebSocket auth failed"
            )
          );
        }
      };

      socket.addEventListener("message", onMessage);
      socket.addEventListener("error", onError);
      socket.addEventListener("close", onClose);
    });
  }

  async command<T>(
    type: string,
    payload: Record<string, unknown> = {}
  ): Promise<T> {
    await this.connect();

    const id = this.nextId++;
    const socket = this.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new HomeAssistantWebSocketError("WebSocket is not open");
    }

    const result = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
    });

    socket.send(JSON.stringify({ id, type, ...payload }));

    return result;
  }

  close() {
    if (this.socket) {
      this.socket.removeEventListener("message", this.handleMessage);
      this.socket.removeEventListener("close", this.handleClose);
      this.socket.close();
      this.socket = null;
    }
  }

  private handleClose = () => {
    for (const deferred of this.pending.values()) {
      deferred.reject(
        new HomeAssistantWebSocketError("WebSocket closed before command completed")
      );
    }

    this.pending.clear();
  };

  private handleMessage = (event: MessageEvent<string>) => {
    const payload = JSON.parse(event.data) as WebSocketResult<unknown>;

    if (typeof payload.id !== "number") {
      return;
    }

    const deferred = this.pending.get(payload.id);
    if (!deferred) {
      return;
    }

    this.pending.delete(payload.id);

    if (payload.success === false) {
      deferred.reject(
        new HomeAssistantWebSocketError(
          payload.error?.message || `Command ${payload.id} failed`
        )
      );
      return;
    }

    deferred.resolve(payload.result);
  };
}

export async function withHomeAssistantWebSocketClient<T>(
  config: HomeAssistantRuntimeConfig,
  run: (client: HomeAssistantWebSocketClient) => Promise<T>
) {
  const client = new HomeAssistantWebSocketClient(config);

  try {
    return await run(client);
  } finally {
    client.close();
  }
}
