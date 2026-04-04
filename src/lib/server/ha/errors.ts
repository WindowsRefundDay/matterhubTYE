export class HomeAssistantConfigError extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = "HomeAssistantConfigError";
  }
}

export class HomeAssistantRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly body?: string
  ) {
    super(message);
    this.name = "HomeAssistantRequestError";
  }
}

export class HomeAssistantWebSocketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeAssistantWebSocketError";
  }
}
