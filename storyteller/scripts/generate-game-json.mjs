// 按 docs/external-game-provider-integration.zh-CN.md 生成 storyteller 的 manifest。
//
// storyteller 是 schema v1 的 frontend-static World（episodeRenderer）。
// 本脚本以模块内的 JS 对象作为单一事实来源，校验后输出 src/game.json，
// 让 manifest 不再手写、始终与文档规范一致。build.mjs 会在生成 dist 前调用它。
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(root, "src");
const defaultOutput = resolve(srcDir, "game.json");

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_LOCALES = ["en", "zh-cn"];

// —— manifest 单一事实来源 ——
// 字段顺序即输出顺序，与原 src/game.json 保持一致。
const manifest = {
  schemaVersion: 1,
  id: "storyteller",
  status: "active",
  entry: "index.html",
  protocolVersion: 1,
  runtime: "frontend-static",
  episodeRenderer: true,
  launchRequirements: { minPlayers: 1 },
  contextScopes: { required: [], optional: [] },
  locales: {
    en: {
      name: "Storyteller",
      description:
        "A cinematic player for interactive episodes with dialogue, media, choices, and app launches.",
    },
    "zh-cn": {
      name: "故事演绎",
      description: "用于演绎互动剧集的电影式播放器，支持对话、媒体、选择与应用拉起。",
    },
  },
  selection: {
    tags: ["interactive-story", "episode", "dialogue", "media"],
    promptHint: {
      en: "Use this app to present a World card's configured interactive episodes.",
      "zh-cn": "使用此应用演绎世界卡中配置的互动剧集。",
    },
  },
};

function validate(target, src = srcDir) {
  const errors = [];
  if (!ID_PATTERN.test(target.id)) {
    errors.push(`id "${target.id}" 不合法（仅小写字母/数字/连字符，须等于目录名）`);
  }
  if (!existsSync(resolve(src, target.entry))) {
    errors.push(`entry "${target.entry}" 在 src/ 下不存在`);
  }
  if (target.schemaVersion !== 1) errors.push("schemaVersion 必须为 1");
  if (target.protocolVersion !== 1) errors.push("protocolVersion 必须为 1");
  if (target.runtime !== "frontend-static") {
    errors.push(`runtime 应为 "frontend-static"，当前为 "${target.runtime}"`);
  }
  for (const locale of REQUIRED_LOCALES) {
    const block = target.locales?.[locale];
    if (!block?.name || !block?.description) {
      errors.push(`locales.${locale} 缺少 name 或 description`);
    }
  }
  const scopes = target.contextScopes ?? {};
  if (!Array.isArray(scopes.required) || !Array.isArray(scopes.optional)) {
    errors.push("contextScopes.required / optional 必须为数组");
  }
  if (typeof target.launchRequirements?.minPlayers !== "number") {
    errors.push("launchRequirements.minPlayers 必须为数字");
  }
  if (errors.length) {
    throw new Error(`game.json 校验失败：\n  - ${errors.join("\n  - ")}`);
  }
}

/** 生成并写回 game.json，返回输出路径。 */
export function generateGameJson(output = defaultOutput) {
  validate(manifest);
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(output, json, "utf-8");
  return output;
}

export { manifest };

// 直接运行：node scripts/generate-game-json.mjs [--output <path>]
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  const idx = process.argv.indexOf("--output");
  const output = idx > -1 ? resolve(process.argv[idx + 1]) : defaultOutput;
  const written = generateGameJson(output);
  console.log(`Generated ${written}`);
}
