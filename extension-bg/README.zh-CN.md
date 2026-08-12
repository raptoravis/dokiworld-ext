# DokiWorld 背景自定义 Extension

[English](README.md)

这是一个独立的 DokiWorld 第三方 UI Extension，用于修改页面背景。它支持 HTTPS 图片地址、基础颜色、遮罩颜色与透明度、图片尺寸和位置，以及启用、禁用与重置。设置仅通过 SDK 提供的命名空间 `context.storage.localStore` API 保存在当前浏览器中。

## SDK 使用示例

本项目特意使用公开的 `@dokiworld/extension-sdk`，作为第三方 Extension 作者的参考示例：

- `src/index.js` 导入 `EXTENSION_API_VERSION` 和 `EXTENSION_CONTRACT_VERSION`，检查带版本的 Chat Header Slot 上下文，并使用 `context.ui.slots`、`context.subscriptions`、`context.storage.localStore`、`context.i18n` 和 `context.logger`。
- `tests/background.test.mjs` 使用 `@dokiworld/extension-sdk/testing` 创建内存中的公开 Extension Host 上下文，不导入 DokiWorld 前端内部模块。
- `scripts/build.mjs` 将 SDK import 打包进 `manifest.json` 声明的单一浏览器 ESM 文件，因此构建后的包中不存在未解析的裸模块 import。

## 体验

```powershell
npm install
npm run serve
```

打开 DokiWorld 的 `/extensions` 页面，然后加载 `http://localhost:4173/manifest.json`。

构建扩展包后，还可以通过 `npm test`、`npm run validate`、`npm run hash` 和 `npm run conformance` 执行可选的项目检查。

该项目源码独立于 DokiWorld 的 `frontend/src/extensions/builtin/` 目录，仅使用公开的 Extension SDK 和 Host API。

## SDK 依赖来源

项目默认使用公共 npm registry 中的 `@dokiworld/extension-sdk@^1.0.1`。联合开发尚未发布的 SDK 变更时，可以临时使用相邻 `dokiworld.git` 仓库中的源码包：

```json
{
  "devDependencies": {
    "@dokiworld/extension-sdk": "file:../../dokiworld.git/packages/extension-sdk"
  }
}
```

修改依赖后运行 `npm install`，使 `package-lock.json` 和 `node_modules` 一起切换到本地包。该路径要求 `dokiworld-exts.git` 与 `dokiworld.git` 是相邻目录。

提交或发布 extension-bg 前，应恢复公共 npm 包并刷新 lockfile：

```powershell
npm install "@dokiworld/extension-sdk@^1.0.1" --save-dev
```
