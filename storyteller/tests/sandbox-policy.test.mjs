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

test("Storyteller business code uses the typed SDK extension instead of wire messages", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /createEpisodeClientExtension/);
  assert.doesNotMatch(source, /dokiworld-app-(?:episode|chat)/);
});

test("wide Storyteller dialogue does not recreate the empty dark column", async () => {
  const stylesheets = await Promise.all([
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/styles.css", import.meta.url), "utf8"),
  ]);
  stylesheets.forEach((styles) => {
    assert.match(styles, /\.lines\s*\{\s*width:\s*100%;\s*max-width:\s*none;\s*min-height:\s*auto;\s*margin:\s*0;/s);
    assert.match(styles, /\.message-group\.is-ai\s*\{\s*width:\s*100%;/s);
    assert.doesNotMatch(styles, /\.message-group\.is-ai\s*\{[^}]*--chat-message-max/s);
    assert.doesNotMatch(styles, /\.message-group\.is-ai\s*\{[^}]*76cqw/s);
  });
});

test("deployable assets and manifest are versioned together", async () => {
  const [packageJson, manifest, html] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../dist/manifest.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
  ]);
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.kind, "world");
  assert.match(html, new RegExp(`\\./styles\\.css\\?v=${packageJson.version.replaceAll(".", "\\.")}`));
  assert.match(html, new RegExp(`\\./app\\.js\\?v=${packageJson.version.replaceAll(".", "\\.")}`));
});
