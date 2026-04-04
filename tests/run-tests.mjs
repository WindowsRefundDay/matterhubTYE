import { execFileSync } from "node:child_process";
import { accessSync, constants, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commonGitDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
  cwd: rootDir,
  encoding: "utf8",
}).trim();
const toolchainRoot = resolveToolchainRoot(rootDir, commonGitDir);
const tscBin = path.join(toolchainRoot, "node_modules", "typescript", "bin", "tsc");
const compiledDir = path.join(rootDir, ".tmp-test");
const testTsconfigPath = path.join(rootDir, "tests", "tsconfig.json");
const loaderPath = path.join(rootDir, "tests", "compiled-alias-loader.mjs");
const testPaths = readdirSync(path.join(rootDir, "tests"))
  .filter((file) => file.endsWith(".test.mjs"))
  .sort()
  .map((file) => path.join(rootDir, "tests", file));

try {
  rmSync(compiledDir, { recursive: true, force: true });

  execFileSync(process.execPath, [tscBin, "-p", testTsconfigPath], {
    cwd: rootDir,
    stdio: "inherit",
  });

  execFileSync(
    process.execPath,
    ["--experimental-loader", loaderPath, "--test", ...testPaths],
    {
      cwd: rootDir,
      stdio: "inherit",
    }
  );
} finally {
  rmSync(compiledDir, { recursive: true, force: true });
}

function resolveToolchainRoot(currentRoot, gitCommonDir) {
  const localTsc = path.join(currentRoot, "node_modules", "typescript", "bin", "tsc");
  if (exists(localTsc)) {
    return currentRoot;
  }

  const commonRoot = path.resolve(rootDir, gitCommonDir, "..");
  const commonTsc = path.join(commonRoot, "node_modules", "typescript", "bin", "tsc");
  if (exists(commonTsc)) {
    return commonRoot;
  }

  throw new Error(
    `Unable to locate TypeScript toolchain from ${currentRoot} or ${commonRoot}`
  );
}

function exists(filePath) {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
