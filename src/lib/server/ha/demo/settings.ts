import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface DemoSettings {
  enabled: boolean;
  liveEntityId: string | null;
  updatedAt: string | null;
}

const DEFAULT_FILE = path.join(process.cwd(), ".tmp", "demo-settings.json");

function resolveFile(env: NodeJS.ProcessEnv): string {
  return env.MATTERHUB_DEMO_SETTINGS_FILE?.trim() || DEFAULT_FILE;
}

export async function readDemoSettings(
  env: NodeJS.ProcessEnv = process.env,
): Promise<DemoSettings> {
  const file = resolveFile(env);
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<DemoSettings>;
    return {
      enabled: parsed.enabled === true,
      liveEntityId: typeof parsed.liveEntityId === "string" ? parsed.liveEntityId : null,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return { enabled: false, liveEntityId: null, updatedAt: null };
  }
}

export async function writeDemoSettings(
  next: { enabled: boolean; liveEntityId?: string | null },
  env: NodeJS.ProcessEnv = process.env,
): Promise<DemoSettings> {
  const file = resolveFile(env);
  await mkdir(path.dirname(file), { recursive: true });
  const payload: DemoSettings = {
    enabled: next.enabled === true,
    liveEntityId: typeof next.liveEntityId === "string" ? next.liveEntityId : null,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}
