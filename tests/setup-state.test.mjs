import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function importCompiled(modulePath) {
  return import(new URL(`../.tmp-test/src/${modulePath}.js`, import.meta.url));
}

test("SettingsPanel surfaces truthful setup and demo state messaging", async () => {
  const { SettingsPanel } = await importCompiled("components/settings/settings-panel");

  const html = renderToStaticMarkup(React.createElement(SettingsPanel));

  assert.match(html, /Awaiting appliance provisioning/);
  assert.match(html, /Demo fixtures still active/);
  assert.match(html, /Home Assistant pairing is not configured yet/);
  assert.doesNotMatch(html, />Connected</);
});

test("Setup and maintenance previews expose the planned operator flows", async () => {
  const [{ default: SetupPage }, { default: MaintenancePage }] = await Promise.all([
    importCompiled("app/setup/page"),
    importCompiled("app/maintenance/page"),
  ]);

  const setupHtml = renderToStaticMarkup(React.createElement(SetupPage));
  const maintenanceHtml = renderToStaticMarkup(React.createElement(MaintenancePage));

  assert.match(setupHtml, /Provision this MatterHub before kiosk mode starts/);
  assert.match(setupHtml, /Join Wi-Fi/);
  assert.match(setupHtml, /demo fixtures/i);

  assert.match(maintenanceHtml, /Recover the appliance without dropping into a desktop shell/);
  assert.match(maintenanceHtml, /Display verification failure overrides every other mode/);
  assert.match(maintenanceHtml, /Maintenance checklist/);
});
