import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createGameOptions } from "../src/game-options.js";

test("nested App iframe cannot escape its sandbox", async () => {
  const html = await readFile(new URL("../src/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /allow-scripts allow-same-origin/);
});

test("nested App host omits absent optional values from its v2 input", () => {
  assert.deepEqual(createGameOptions({ configId: "chapter-game" }), {
    configId: "chapter-game",
  });
});

test("opaque Storyteller sandbox receives the App catalog from its host", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(["']\/games\/catalog\.json/);
  assert.match(source, /appCatalog = Array\.isArray\(message\.apps\)/);
  assert.match(source, /targetOrigin: "\*"/);
});
