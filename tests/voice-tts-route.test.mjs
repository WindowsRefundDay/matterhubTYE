import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(rootDir, "src", "app", "api", "voice", "tts", "route.ts");

async function readRouteSource() {
  return readFile(routePath, "utf8");
}

test("voice tts route requires text instead of accepting live audio payloads", async () => {
  const source = await readRouteSource();

  assert.match(source, /type TtsRequestBody = \{\s+text\?: string;\s+\};/s);
  assert.match(source, /const \{ text \} = \(await request\.json\(\)\) as TtsRequestBody;/);
  assert.match(source, /if \(!text\?\.trim\(\)\)/);
  assert.match(source, /Missing text\./);
  assert.doesNotMatch(source, /runVoiceConversationTurn|getUserMedia|MediaRecorder|playbackDeviceId/);
});

test("voice tts route remains a synthesis-only piper endpoint", async () => {
  const source = await readRouteSource();

  assert.match(source, /spawn\(piperBin, \["--model", modelPath, "--output_raw"\], \{/);
  assert.match(source, /"Content-Type": "audio\/wav"/);
  assert.match(source, /return NextResponse\.json\(\{ status: "no-tts" \}\);/);
  assert.doesNotMatch(source, /mimeType: string;\s+context: VoiceContext|getUserMedia|AudioContext|SpeechRecognition/);
});
