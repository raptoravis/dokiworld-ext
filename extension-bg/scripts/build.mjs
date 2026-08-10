import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const files = [
  ["src/styles.css", "styles.css"],
  ["en.json", "en.json"],
  ["zh-CN.json", "zh-CN.json"],
];
await Promise.all(files.map(([source, target]) => copyFile(resolve(root, source), resolve(dist, target))));

// Third-party manifests expose one self-contained browser ESM entry. Bundling
// resolves the SDK package import so the browser never sees a bare specifier.
await build({
  entryPoints: [resolve(root, "src/index.js")],
  outfile: resolve(dist, "index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});

const manifest = JSON.parse(await readFile(resolve(root, "manifest.template.json"), "utf8"));
for (const resource of manifest.resources) {
  resource.bytes = (await stat(resolve(dist, resource.path))).size;
}
await writeFile(resolve(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${manifest.id} ${manifest.version} in ${dist}`);
