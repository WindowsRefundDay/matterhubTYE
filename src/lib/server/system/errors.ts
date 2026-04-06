export class SystemConfigError extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = "SystemConfigError";
  }
}

export class SystemHardwareError extends Error {
  constructor(message: string, readonly subsystem: string) {
    super(message);
    this.name = "SystemHardwareError";
  }
}

export class SystemCommandError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly exitCode?: number,
  ) {
    super(message);
    this.name = "SystemCommandError";
  }
}
