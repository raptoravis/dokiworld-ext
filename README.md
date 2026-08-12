# dokiworld-exts

DokiWorld 的第三方 UI Extension 集合。仓库中的 Extension 使用相邻 DokiWorld 仓库提供的 `@dokiworld/extension-sdk` 开发、测试和校验，并构建为可独立托管的浏览器静态资源包。

UI Extension 与 iframe App 不同：它们作为同源浏览器代码运行，可以挂载 DokiWorld 提供的 UI Slot、订阅事件、注册命令并使用命名空间存储。Extension SDK 提供版本化 interface、兼容性检查和恢复机制，但不是权限沙箱；安装前仍应审核第三方源码和构建产物。

## 项目结构

| 目录 | 版本 | Extension ID | 说明 |
|---|---:|---|---|
| `extension-bg` | `1.2.2` | `third-party.background-customizer` | 页面背景自定义 Extension，支持背景图片、底色、遮罩、尺寸、位置、启用/禁用和重置 |

每个 Extension 在自己的目录中维护：

- 源码与样式；
- `manifest.template.json`；
- 英文和简体中文 locale 资源；
- 构建、开发服务器及测试脚本；
- 可部署的 `dist/` 目录；
- Extension 自身的中英文 README。

## Extension SDK

SDK 位于：

```text
D:\dev\dokiworld.git\packages\extension-sdk
```

Extension 通过本地开发依赖引用它：

```json
{
  "devDependencies": {
    "@dokiworld/extension-sdk": "file:../../dokiworld.git/packages/extension-sdk"
  }
}
```

当前 SDK 版本为 `1.0.0`，Extension manifest 使用兼容范围：

```json
{
  "apiVersion": "^1.0.0"
}
```

构建时会把 SDK import 内联到 Extension 的浏览器 ESM 入口，因此部署后的 `dist/index.js` 不包含无法由浏览器解析的裸 npm import。

### 公开 interface

`@dokiworld/extension-sdk` 提供：

- `activate(context)` / `deactivate()` 生命周期；
- 版本化 UI Slot context；
- Commands、Events 和 Interceptors；
- `context.subscriptions` 统一资源释放；
- `context.storage.localStore` Extension 隔离存储；
- `context.i18n` 本地化；
- `context.logger` 结构化日志；
- Disposable 及相关 TypeScript 类型。

`@dokiworld/extension-sdk/testing` 提供内存中的公开 Host context，测试无需导入 DokiWorld 前端内部模块。

## extension-bg

[`extension-bg`](extension-bg/) 是当前仓库的完整 Vanilla Extension 示例。

它在激活时：

1. 从 `context.storage.localStore` 读取命名空间配置，并迁移旧版浏览器存储。
2. 将背景设置应用到页面、聊天页和聊天背景层。
3. 在 `extensions.settings` Slot 挂载完整设置面板。
4. 在 `app.header.actions` Slot 的 Chat Header context 中挂载设置按钮。
5. 通过 `context.subscriptions` 管理 Slot cleanup。
6. 在停用时关闭对话框、断开 DOM observer，并恢复原有样式。

使用的主要 SDK interface：

```js
import {
  EXTENSION_API_VERSION,
  EXTENSION_CONTRACT_VERSION,
} from "@dokiworld/extension-sdk";

export async function activate(context) {
  const settings = await context.storage.localStore.get("background-settings.v1");
  const dispose = context.ui.slots.mount("extensions.settings", ({ element }) => {
    // Mount Extension-owned UI.
  });
  context.subscriptions.add(dispose);
}
```

Extension 会校验 Slot context 的 `version` 和 `surface`，避免把 Chat Header 专用 UI 挂载到其他页面。

## 安装与构建

安装依赖并构建背景 Extension：

```powershell
cd D:\dev\dokiworld-exts.git\extension-bg
npm install
npm run build
```

构建流程会：

- 清理并重新创建 `dist/`；
- 使用 esbuild 将 `src/index.js` 和 Extension SDK 打包为单一 ESM；
- 复制 CSS 与 `en.json`、`zh-CN.json`；
- 根据实际文件大小生成 `dist/manifest.json`。

不要直接编辑 `dist/`。应修改源码、locale 或 manifest 模板，然后重新运行构建。

## 本地开发与安装

启动自带的 CORS 开发服务器：

```powershell
cd D:\dev\dokiworld-exts.git\extension-bg
npm run serve
```

默认 manifest 地址：

```text
http://localhost:4173/manifest.json
```

然后在 DokiWorld 中打开 `/extensions`，把该地址粘贴到 Extension Manager 的安装输入框。开发服务器仅监听 `127.0.0.1`，响应包含 CORS 和 `Cache-Control: no-store`，适合本地迭代。

可以通过环境变量或位置参数修改端口：

```powershell
$env:EXTENSION_BG_PORT=4180
npm run serve

# 或
node scripts/serve.mjs 4180
```

## 测试与包校验

在 `extension-bg` 目录运行：

```powershell
npm test
npm run build
npm run validate
npm run hash
npm run conformance
```

各命令用途：

| 命令 | 作用 |
|---|---|
| `npm test` | 使用 `@dokiworld/extension-sdk/testing` 验证背景应用、Slot 挂载和 cleanup |
| `npm run validate` | 校验 manifest schema、资源路径、文件大小、依赖和翻译键 |
| `npm run hash` | 计算 Extension 包的确定性 SHA-256 内容哈希 |
| `npm run conformance` | 检查英文/简体中文键一致性及禁止的动态执行等严格规则 |

发布前应按以上顺序全部执行。`validate`、`hash` 和 `conformance` 针对 `dist/manifest.json`，因此必须先构建。

## Manifest 约定

第三方 Extension manifest 使用 camelCase 字段：

```json
{
  "schemaVersion": 1,
  "id": "third-party.example",
  "nameKey": "extension.name",
  "displayName": "Example Extension",
  "version": "1.0.0",
  "apiVersion": "^1.0.0",
  "entry": "index.js",
  "resources": [],
  "loadingOrder": 100
}
```

要求：

- Extension ID、版本和资源路径必须稳定。
- `entry` 必须是构建后的浏览器 ESM。
- 所有 JavaScript、CSS 和 locale 文件都必须列在 `resources` 中。
- `resources[].bytes` 必须与构建产物实际大小一致。
- 英文是规范产品语言，新增用户可见字符串必须同时提供简体中文翻译。
- `en.json` 与 `zh-CN.json` 必须具有相同的语义键。
- 不得从第三方 Extension 导入 DokiWorld 的 `frontend/src` 内部模块。

## 新增 Extension

新增 Extension 时建议：

1. 从 `@dokiworld/extension-sdk/templates/vanilla` 或 `templates/react` 起步。
2. 在本仓库创建独立目录，不要把第三方源码放入 DokiWorld 的 `frontend/src/extensions/builtin/`。
3. 使用独立、稳定的 Extension ID 和命名空间 storage key。
4. 为所有 Slot context 做版本和 surface 校验。
5. 把所有 listener、Slot mount、observer 和其他资源注册到统一 cleanup 流程。
6. 提供英文及简体中文 locale，并补充公开 Host context 测试。
7. 构建后执行 validate、hash 和 conformance。
8. 将 `dist/` 发布到启用 CORS 的 HTTPS 源，并分享 `manifest.json` URL。

## 安全说明

UI Extension 运行在 DokiWorld 的同源页面环境中，不具备 iframe 安全隔离。SDK 的 schema、版本和 conformance 检查只能降低兼容性与供应链风险，不能阻止已经运行的恶意或阻塞代码。

仅安装可信来源的 Extension；发布者应固定内容哈希、保留可审计源码，并避免读取与功能无关的用户数据。
