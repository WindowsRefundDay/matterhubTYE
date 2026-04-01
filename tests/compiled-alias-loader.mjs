import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const compiledRoot = path.join(process.cwd(), ".tmp-test", "src");

function ensureJsExtension(targetPath) {
  return path.extname(targetPath) ? targetPath : `${targetPath}.js`;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const resolvedPath = ensureJsExtension(
      path.join(compiledRoot, specifier.slice(2))
    );

    return defaultResolve(
      pathToFileURL(resolvedPath).href,
      context,
      defaultResolve
    );
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier)
  ) {
    const parentPath = context.parentURL
      ? fileURLToPath(context.parentURL)
      : process.cwd();
    const resolvedPath = ensureJsExtension(
      path.resolve(path.dirname(parentPath), specifier)
    );

    return defaultResolve(
      pathToFileURL(resolvedPath).href,
      context,
      defaultResolve
    );
  }

  return defaultResolve(specifier, context, defaultResolve);
}
