import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./test-helpers.mjs";

function createJsonRequest(body) {
  return new Request("http://localhost/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("voice tts route rejects audio-only live payloads", async () => {
  const { POST } = await importCompiled("app/api/voice/tts/route");

  const response = await POST(
    createJsonRequest({
      audio: "data:audio/webm;base64,AAAA",
      mimeType: "audio/webm",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    status: "error",
    error: "Missing text.",
  });
});

test("voice tts route stays synthesis-only when extra live fields are present", async () => {
  const { POST } = await importCompiled("app/api/voice/tts/route");
  const previousBinary = process.env.PIPER_BINARY_PATH;

  process.env.PIPER_BINARY_PATH = "/tmp/matterhub-missing-piper";

  try {
    const response = await POST(
      createJsonRequest({
        text: "Turn on the kitchen lights",
        audio: "data:audio/webm;base64,AAAA",
        mimeType: "audio/webm",
        playbackDeviceId: "speaker-1",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "no-tts" });
  } finally {
    if (previousBinary === undefined) {
      delete process.env.PIPER_BINARY_PATH;
    } else {
      process.env.PIPER_BINARY_PATH = previousBinary;
    }
  }
});
