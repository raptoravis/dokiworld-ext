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

test("configured legacy Apps retain their v1 launch and result bridge", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /entry\.protocolVersion === 1/);
  assert.match(source, /createLegacyGameInitMessage/);
  assert.match(source, /parseLegacyAppMessage/);
  assert.match(source, /message\.type === "dokiworld-game-result"/);
});

test("Storyteller business code uses the typed SDK extension instead of wire messages", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /createEpisodeClientExtension/);
  assert.doesNotMatch(source, /dokiworld-app-(?:episode|chat)/);
});

test("assistant identity is rendered inside every Storyteller message bubble", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.equal(source.match(/bubble\.prepend\(heading\);/g)?.length, 4);
  assert.equal(source.match(/content\.append\(bubble\);/g)?.length, 4);
  assert.doesNotMatch(source, /content\.append\(heading, bubble\)/);
});

test("Storyteller conversation uses the full left-aligned transcript width", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.lines\s*\{\s*width:\s*100%;\s*max-width:\s*none;[\s\S]*?margin:\s*0;/);
  assert.match(styles, /\.message-group\.is-ai\s*\{\s*width:\s*100%;/);
  assert.match(styles, /\.opening-tagline\s*\{[\s\S]*?margin:\s*0 0 clamp\(24px,\s*2vw,\s*32px\);/);
});

test("Storyteller header spans the panel while its tools avoid the host exit control", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.topbar\s*\{[\s\S]*?margin-right:\s*0;/);
  assert.match(
    styles,
    /\.topbar\s*\{[\s\S]*?padding:\s*9px calc\(14px \+ var\(--host-exit-safe,\s*0px\)\) 9px 16px;/,
  );
});
