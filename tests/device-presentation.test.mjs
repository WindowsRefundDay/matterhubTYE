import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import {
  importCompiled,
  renderCompiled,
  renderWithProvider,
} from "./test-helpers.mjs";

async function renderDeviceControl(device) {
  const { DeviceControl } = await importCompiled("components/devices/device-control");

  return renderWithProvider(React.createElement(DeviceControl, { device }));
}

async function renderDeviceTile(device) {
  return renderCompiled("components/devices/device-tile", "DeviceTile", {
    device,
    onToggle: () => undefined,
    onSelect: () => undefined,
  });
}

test("DeviceTile preserves per-device status text", async () => {
  const { initialDevices } = await importCompiled("data/devices");

  const lightHtml = await renderDeviceTile(initialDevices[0]);
  const thermostatHtml = await renderDeviceTile(initialDevices[9]);
  const lockHtml = await renderDeviceTile(initialDevices[13]);
  const offSensorHtml = await renderDeviceTile({
    ...initialDevices[4],
    isOn: false,
  });

  assert.match(lightHtml, /80%/);
  assert.match(thermostatHtml, /71°F/);
  assert.match(lockHtml, /Locked/);
  assert.match(offSensorHtml, />Off</);
});

test("DeviceControl preserves control routing for each device group", async () => {
  const { initialDevices } = await importCompiled("data/devices");

  const lightHtml = await renderDeviceControl(initialDevices[0]);
  const plugHtml = await renderDeviceControl(initialDevices[2]);
  const thermostatHtml = await renderDeviceControl(initialDevices[9]);
  const fanHtml = await renderDeviceControl(initialDevices[6]);
  const lockHtml = await renderDeviceControl(initialDevices[13]);
  const cameraHtml = await renderDeviceControl(initialDevices[12]);

  assert.match(lightHtml, /Brightness/);
  assert.match(plugHtml, /Brightness/);
  assert.match(thermostatHtml, /Current: 72°F/);
  assert.match(fanHtml, /Speed/);
  assert.match(lockHtml, /Unlock/);
  assert.match(cameraHtml, /Recording/);
});
