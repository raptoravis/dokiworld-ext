import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateGameJson } from "./generate-game-json.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src");
const output = resolve(root, "dist");

// 按 docs/external-game-provider-integration 规范刷新 manifest，确保 src/game.json
// 始终是生成产物，再随 src 一起拷贝进 dist。
generateGameJson();

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
console.log(`Built Storyteller to ${output}`);
