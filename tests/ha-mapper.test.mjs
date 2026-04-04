import assert from "node:assert/strict";
import test from "node:test";

async function importCompiled(modulePath) {
  return import(new URL(`../.tmp-test/src/${modulePath}.js`, import.meta.url));
}

test("buildSmartHomeSnapshot maps supported Home Assistant entities into MatterHub structures", async () => {
  const { buildSmartHomeSnapshot } = await importCompiled("lib/server/ha/mapping");

  const snapshot = buildSmartHomeSnapshot({
    areas: [{ area_id: "living-room", name: "Living Room" }],
    entityRegistry: [
      { entity_id: "light.ceiling_light", area_id: "living-room" },
      { entity_id: "lock.front_door", area_id: "living-room" },
      { entity_id: "scene.movie_night", area_id: "living-room" },
      { entity_id: "sensor.outdoor_temperature", area_id: "living-room" },
    ],
    states: [
      {
        entity_id: "light.ceiling_light",
        state: "on",
        attributes: {
          friendly_name: "Ceiling Light",
          brightness_pct: 80,
        },
      },
      {
        entity_id: "lock.front_door",
        state: "locked",
        attributes: {
          friendly_name: "Front Door",
        },
      },
      {
        entity_id: "scene.movie_night",
        state: "scening",
        attributes: {
          friendly_name: "Movie Night",
        },
      },
      {
        entity_id: "sensor.outdoor_temperature",
        state: "68",
        attributes: {
          friendly_name: "Outdoor Temperature",
          unit_of_measurement: "°F",
        },
      },
      {
        entity_id: "weather.home",
        state: "sunny",
        attributes: {
          friendly_name: "Home",
          temperature: 68,
          forecast_high: 74,
          forecast_low: 58,
        },
      },
      {
        entity_id: "vacuum.roomba",
        state: "docked",
        attributes: {
          friendly_name: "Roomba",
        },
      },
    ],
  });

  assert.equal(snapshot.mode, "home-assistant");
  assert.equal(snapshot.rooms.length, 1);
  assert.equal(snapshot.rooms[0].name, "Living Room");
  assert.equal(snapshot.devices.length, 3);
  assert.equal(snapshot.scenes.length, 1);
  assert.equal(snapshot.devices[0].id, "light.ceiling_light");
  assert.equal(snapshot.entityReferences["lock.front_door"].domain, "lock");
  assert.equal(snapshot.weather?.temperature, 68);
  assert.ok(
    snapshot.diagnostics.some(
      (item) => item.code === "unsupported_domain" && item.entityId === "vacuum.roomba"
    )
  );
});
