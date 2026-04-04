import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export async function importCompiled(modulePath) {
  return import(new URL(`../.tmp-test/src/${modulePath}.js`, import.meta.url));
}

export async function renderWithProvider(element) {
  const { SmartHomeProvider } = await importCompiled("hooks/use-smart-home");

  return renderToStaticMarkup(
    React.createElement(SmartHomeProvider, null, element)
  );
}

export async function renderCompiled(modulePath, exportName, props = {}) {
  const importedModule = await importCompiled(modulePath);
  const Component = importedModule[exportName];

  return renderToStaticMarkup(React.createElement(Component, props));
}

export async function renderCompiledWithProvider(
  modulePath,
  exportName,
  props = {}
) {
  const importedModule = await importCompiled(modulePath);
  const Component = importedModule[exportName];

  return renderWithProvider(React.createElement(Component, props));
}
