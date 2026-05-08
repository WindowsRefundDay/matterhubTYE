import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readSource(relPath) {
  return readFile(path.join(rootDir, relPath), "utf8");
}

test("voice session start route delegates to voice engine orchestrator", async () => {
  const source = await readSource("src/app/api/voice/session/route.ts");

  assert.match(source, /startVoiceEngineSession/);
  assert.match(source, /export async function POST\(\)/);
  assert.match(source, /return NextResponse\.json\(\{ status: "ok", session \}\);/);
});

test("voice session SSE route streams session updates", async () => {
  const source = await readSource("src/app/api/voice/session/[id]/events/route.ts");

  assert.match(source, /text\/event-stream/);
  assert.match(source, /subscribeVoiceEngineSession/);
  assert.match(source, /request\.signal\.addEventListener\("abort"/);
});

test("voice assistant hook now uses session APIs instead of monolithic turn endpoint", async () => {
  const source = await readSource("src/hooks/use-voice-assistant.ts");

  assert.match(source, /fetch\("\/api\/voice\/session"/);
  assert.match(source, /new EventSource\(`\/api\/voice\/session\/\$\{sessionId\}\/events`\)/);
  assert.match(source, /fetch\(`\/api\/voice\/session\/\$\{sessionId\}\/stop`/);
  assert.doesNotMatch(source, /\/api\/voice\/turn/);
});
