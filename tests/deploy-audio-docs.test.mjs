import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("phase 1 audio docs mark non-Pi hosts unsupported", () => {
  const rootReadme = readRepoFile("README.md");
  const deployReadme = readRepoFile("deploy/raspberry-pi/README.md");
  const agentNotes = readRepoFile("agents-testing.md");

  assert.match(rootReadme, /supported:\s*false/i);
  assert.match(rootReadme, /mode:\s*"unsupported"/i);
  assert.match(deployReadme, /supported:\s*false/i);
  assert.match(deployReadme, /mode:\s*"unsupported"/i);
  assert.match(agentNotes, /non-Pi development machines/i);
  assert.match(agentNotes, /mode:\s*"unsupported"/i);
});

test("pi deployment artifacts deprecate Chromium ALSA device flags", () => {
  const deployReadme = readRepoFile("deploy/raspberry-pi/README.md");
  const autostart = readRepoFile("deploy/raspberry-pi/labwc-autostart");
  const chromiumLaunchLine = autostart
    .split("\n")
    .find((line) => line.includes("exec chromium"));

  assert.match(deployReadme, /--alsa-input-device/);
  assert.match(deployReadme, /--alsa-output-device/);
  assert.match(deployReadme, /do \*\*not\*\* add/i);
  assert.ok(chromiumLaunchLine, "expected Chromium launch command");
  assert.doesNotMatch(chromiumLaunchLine, /--alsa-(input|output)-device\b/);
});

test("pi deployment docs list os-level audio tool and permission requirements", () => {
  const deployReadme = readRepoFile("deploy/raspberry-pi/README.md");
  const verificationNotes = readRepoFile("tests/arch-arm-verification.md");

  for (const requiredTerm of ["aplay", "arecord", "audio"]) {
    assert.match(deployReadme, new RegExp(`\\b${requiredTerm}\\b`, "i"));
  }

  assert.match(verificationNotes, /supported:\s*false/i);
  assert.match(verificationNotes, /--alsa-input-device/);
  assert.match(verificationNotes, /--alsa-output-device/);
});
