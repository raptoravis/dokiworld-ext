import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Banquet Contract routes episode traffic through the typed SDK extension", async () => {
  const source = await readFile(new URL("../world.js", import.meta.url), "utf8");
  assert.match(source, /createEpisodeClientExtension/);
  assert.doesNotMatch(source, /dokiworld-app-episode/);
  assert.match(source, /message\.type === "episode\.gameResolved"/);
  assert.match(
    source,
    /if \(episodeMode\) \{\s+showResult\(result, \{ persist: false \}\);\s+postEpisodeEvent\(\{/,
    "the configured app must leave the nested game before waiting for episode resolution",
  );
});
