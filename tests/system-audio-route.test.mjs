import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(rootDir, "src", "app", "api", "system", "audio", "route.ts");

async function readRouteSource() {
  return readFile(routePath, "utf8");
}

test("system audio route wires GET to the OS-level audio status helper", async () => {
  const source = await readRouteSource();

  assert.match(source, /import \{ getAudioStatus, handleAudioAction \} from "@\/lib\/server\/system";/);
  assert.match(source, /export async function GET\(\) \{[\s\S]*return NextResponse\.json\(await getAudioStatus\(\)\);/);
});

test("system audio route only accepts speaker and mic test actions", async () => {
  const source = await readRouteSource();

  assert.match(source, /function isAudioAction\(value: unknown\): value is AudioAction \{/);
  assert.match(source, /return action === "speaker_test" \|\| action === "mic_test";/);
  assert.match(source, /return NextResponse\.json\(\{ error: "Invalid audio action" \}, \{ status: 400 \}\);/);
});

test("system audio route rejects malformed JSON and returns successful action payloads", async () => {
  const source = await readRouteSource();

  assert.match(source, /body = await request\.json\(\);/);
  assert.match(source, /return NextResponse\.json\(\{ error: "Invalid request body" \}, \{ status: 400 \}\);/);
  assert.match(source, /const result = await handleAudioAction\(body\);/);
  assert.match(source, /return NextResponse\.json\(\{ status: "ok", \.\.\.result \}\);/);
});
