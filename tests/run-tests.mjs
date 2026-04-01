import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tscBin = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
const compiledDir = path.join(rootDir, ".tmp-test");
const testTsconfigPath = path.join(rootDir, "tests", "tsconfig.json");
const loaderPath = path.join(rootDir, "tests", "compiled-alias-loader.mjs");
const testPath = path.join(rootDir, "tests", "device-presentation.test.mjs");

try {
  rmSync(compiledDir, { recursive: true, force: true });

  execFileSync(
    process.execPath,
    [tscBin, "-p", testTsconfigPath],
    {
      cwd: rootDir,
      stdio: "inherit",
    }
  );

  execFileSync(
    process.execPath,
    ["--experimental-loader", loaderPath, "--test", testPath],
    {
      cwd: rootDir,
      stdio: "inherit",
    }
  );
} finally {
  rmSync(compiledDir, { recursive: true, force: true });
}
