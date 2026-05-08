import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executorPath = path.join(rootDir, "src", "lib", "server", "voice", "executor.ts");

async function readExecutorSource() {
  return readFile(executorPath, "utf8");
}

test("voice executor exposes gemini transcription adapter", async () => {
  const source = await readExecutorSource();

  assert.match(source, /export async function transcribeAudioWithGemini\(/);
});

test("voice executor includes text-first reasoning turn", async () => {
  const source = await readExecutorSource();

  assert.match(source, /export async function runVoiceTextConversationTurn\(/);
  assert.match(source, /chat\.sendMessage\(\[\{ text: userMessage \}\]\)/);
});

test("audio turn falls back to text reasoning after transcription", async () => {
  const source = await readExecutorSource();

  assert.match(source, /const userText = await transcribeAudioWithGemini\(/);
  assert.match(source, /const textTurn = await runVoiceTextConversationTurn\(userText, voiceContext\);/);
});
