import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface AudioTestLogDeps {
  mkdir: typeof mkdir;
  readFile: typeof readFile;
  writeFile: typeof writeFile;
}

const defaultDeps: AudioTestLogDeps = {
  mkdir,
  readFile,
  writeFile,
};

interface AudioTestLogPayload {
  event: string;
  details?: Record<string, unknown>;
}

const DEFAULT_AUDIO_TEST_LOG_FILE = path.join(
  process.cwd(),
  ".tmp",
  "audio-test-events.jsonl",
);

function getLogFilePath(env: NodeJS.ProcessEnv = process.env) {
  return env.MATTERHUB_AUDIO_TEST_LOG_FILE ?? DEFAULT_AUDIO_TEST_LOG_FILE;
}

export async function appendAudioTestLog(
  payload: AudioTestLogPayload,
  deps: AudioTestLogDeps = defaultDeps,
  env: NodeJS.ProcessEnv = process.env,
) {
  const logFile = getLogFilePath(env);
  const entry = {
    timestamp: new Date().toISOString(),
    event: payload.event,
    details: payload.details ?? {},
  };

  await deps.mkdir(path.dirname(logFile), { recursive: true });

  let existing = "";
  try {
    existing = await deps.readFile(logFile, "utf8");
  } catch {
    existing = "";
  }

  await deps.writeFile(logFile, `${existing}${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export async function readRecentAudioTestLogs(
  limit = 200,
  deps: AudioTestLogDeps = defaultDeps,
  env: NodeJS.ProcessEnv = process.env,
) {
  const logFile = getLogFilePath(env);

  try {
    const content = await deps.readFile(logFile, "utf8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch {
    return [];
  }
}
