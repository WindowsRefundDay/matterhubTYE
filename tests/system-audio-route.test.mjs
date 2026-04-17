import assert from "node:assert/strict";
import test from "node:test";
import { importCompiled } from "./test-helpers.mjs";

process.env.MATTERHUB_SYSTEM_MODE = "mock";

async function importRouteModule() {
  return importCompiled("app/api/system/audio/route");
}

test("system audio GET returns the mock OS-level audio status shape", async () => {
  const { GET } = await importRouteModule();

  const response = await GET();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    supported: false,
    mode: "mock",
    backend: "mock",
    speakerTestAvailable: true,
    micTestAvailable: true,
    output: {
      available: false,
      label: "Preview mode",
      volumePercent: null,
      muted: null,
    },
    input: {
      available: false,
      label: "Preview mode",
      volumePercent: null,
      muted: null,
    },
  });
});

test("system audio POST runs mock speaker and mic tests", async () => {
  const { POST } = await importRouteModule();

  const speakerResponse = await POST(
    new Request("http://localhost/api/system/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "speaker_test" }),
    }),
  );
  const micResponse = await POST(
    new Request("http://localhost/api/system/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "mic_test" }),
    }),
  );

  assert.equal(speakerResponse.status, 200);
  assert.deepEqual(await speakerResponse.json(), {
    status: "ok",
    action: "speaker_test",
    ok: true,
    mode: "mock",
    message: "Mock speaker test completed.",
    artifactFile: null,
  });

  assert.equal(micResponse.status, 200);
  assert.deepEqual(await micResponse.json(), {
    status: "ok",
    action: "mic_test",
    ok: true,
    mode: "mock",
    message: "Mock microphone test completed.",
    artifactFile: null,
  });
});

test("system audio POST rejects invalid actions", async () => {
  const { POST } = await importRouteModule();

  const invalidActionResponse = await POST(
    new Request("http://localhost/api/system/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    }),
  );
  const invalidJsonResponse = await POST(
    new Request("http://localhost/api/system/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    }),
  );

  assert.equal(invalidActionResponse.status, 400);
  assert.deepEqual(await invalidActionResponse.json(), {
    error: "Invalid audio action",
  });

  assert.equal(invalidJsonResponse.status, 400);
  assert.deepEqual(await invalidJsonResponse.json(), {
    error: "Invalid request body",
  });
});
