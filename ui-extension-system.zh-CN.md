# DokiWorld UI Extension 系统

本文是 DokiWorld Web UI Extension 的简体中文概览、用户手册和作者手册。英文文档是规范来源，本文与其保持一致。

## Extension 与 App 的区别

UI Extension 和 iframe App 是两套独立的插件模型：

| | UI Extension | Game / World App |
| --- | --- | --- |
| SDK | `@dokiworld/extension-sdk` | `@dokiworld/app-sdk` |
| 运行方式 | DokiWorld 页面中的同源代码 | 使用 `dokiworld.app/2` 的 iframe |
| 发现方式 | 用户安装 manifest URL | Game/World catalog 发现打包 manifest |
| interface | Slot、Command、Event、Interceptor、Storage | 生命周期、输入输出 contract、类型化 capability |
| 隔离 | 不构成安全沙箱 | iframe/origin 与消息校验 |

不要用 App manifest 开发 Extension，也不要把 Extension 代码复制进 Game/World 包。App 的开发、manifest 和打包流程见 [`app-sdk-app-development.zh-CN.md`](app-sdk-app-development.zh-CN.md)。

## 支持的 Extension 来源

DokiWorld 只支持两种 UI Extension 来源：

| 来源 | 位置 | 安装方式 |
| --- | --- | --- |
| Built-in Extension | `frontend/src/extensions/builtin/` | 随 DokiWorld 前端编译和发布 |
| Third-party Extension | 任意独立目录或仓库 | 从 HTTPS `manifest.json` URL 安装 |

第三方源码不能放在 `frontend/src/extensions/builtin/`。源码和构建产物可以位于磁盘任意目录或独立仓库；安装过程不会把第三方文件复制到 DokiWorld 仓库。

DokiWorld 不再提供 Extension Registry、Registry index、审核队列、Author/Reviewer 账户角色、签名目录或撤销列表。第三方作者直接分发包，由用户决定是否信任每个来源和包哈希。

## 用户流程

打开 `/extensions`，粘贴第三方 `manifest.json` 的 HTTPS URL。Manager 会获取完整依赖计划，校验每个 manifest 和资源，并在安装前显示每个来源及固定的 SHA-256。用户必须逐包明确确认。

已安装的第三方 Extension 可以启用、禁用、手动更新、回滚或卸载。更新不会自动执行；内容发生变化时，Manager 会展示新的包哈希并要求再次确认。包字节存入浏览器 Cache Storage；安装元数据和设备设置存入浏览器存储；登录账户的安装元数据和账户设置由后端同步。

如果 Extension 导致页面损坏，使用 Manager 提供的安全模式 URL。安全模式会在加载前阻止全部第三方代码；另一个恢复操作可以清除全部第三方启用状态。

## 作者流程

从 SDK 模板开始，不要从 built-in 目录复制：

```text
packages/extension-sdk/templates/vanilla/
packages/extension-sdk/templates/react/
```

完整参考实现是相邻 `dokiworld-exts` 仓库中的 `extension-bg`。它展示了公开 Extension SDK 与测试 Host、manifest 生成、包校验、支持 CORS 的本地服务、设置 UI、本地化和生命周期清理。Git 仓库地址只是源码参考，不是可安装的 manifest 地址。

默认通过公共 npm 包开发；只有联合调试尚未发布的 SDK 变更时才临时使用 `file:`：

```powershell
npm install --save-dev "@dokiworld/extension-sdk@^1.0.1"
# 临时本地形式：
# npm install --save-dev "file:../../dokiworld.git/packages/extension-sdk"
```

先构建，再对生成的包执行：

```bash
dokiworld-extension validate ./manifest.json
dokiworld-extension hash ./manifest.json
dokiworld-extension conformance ./manifest.json
```

公开 manifest 使用 camelCase 字段，例如 `schemaVersion`、`nameKey`、`apiVersion`、`dependencySources` 和 `loadingOrder`。SDK 模板与校验器是权威格式。

本地开发时，先构建包，再使用支持 CORS 的 HTTP 或 HTTPS loopback 服务暴露包含 `manifest.json` 和全部声明资源的目录。使用与正式发布包相同的安装输入框加载例如 `http://localhost:4173/manifest.json`。HTTP 仅支持精确主机 `localhost`、`127.0.0.1` 和 `[::1]`；系统始终执行 schema、兼容性、路径、依赖、语言、MIME、哈希和大小校验。

正式分发时，把同一份静态构建发布到支持 CORS 的 HTTPS origin，并分享 manifest URL。不要分发 Git URL、源码目录、ZIP、安装脚本或包管理器命令。

构建必须把 SDK 内联到浏览器 ESM 入口，并根据 package 版本、manifest 模板和实际输出资源大小生成 `dist/manifest.json`。不要手工编辑 `dist/`。

## Package 契约

Extension 包包含一个浏览器 ESM 入口，并以准确的路径、类型和字节数声明全部资源。英文语言内容必需。第三方包可以不提供简体中文；一旦提供，必须与英文使用相同的语义翻译键。

依赖使用 SemVer 范围。第三方包通过 `dependencySources` 将每个依赖 ID 映射到固定的 manifest URL。Host 解析完整依赖图，并在依赖方之前激活依赖。任何获取、校验、缓存写入或激活失败都会回滚整个安装事务。

Manifest 不包含运行时权限。UI Extension 作为同源页面代码运行，几乎可以完整访问 DOM 和应用上下文；它可能读取页面可见数据、修改或隐藏页面、通过浏览器网络 API 发送数据、泄漏监听器或阻塞主线程。Manifest 校验、哈希确认、超时、诊断、失败禁用、回滚和安全模式只能降低运维风险，不构成安全沙箱。

## 公开 Host API

Built-in 与 third-party Extension 使用相同的稳定 Host API：

- 生命周期激活、停用和受跟踪的 Disposable；
- 注册 UI Slot；
- 带命名空间的 Command；
- 应用 Event；
- 带顺序和超时的 Interceptor；
- 带命名空间的账户设置、聊天元数据和设备本地存储；
- 结构化本地诊断；
- 翻译查找和按 locale 格式化日期时间。

Built-in Extension 可以静态打包，但不能依赖第三方包无法使用的隐藏 Extension API。

## 本地化、无障碍和质量

产品自有内容和 built-in Extension 以英文为规范语言，并在同一次变更中提供匹配的简体中文。第三方 Extension 必须提供英文，并建议提供简体中文。扩展 UI 应保持语义化 HTML、键盘操作、可见焦点、无障碍名称、减少动态效果偏好、明暗主题和窄屏布局。

## 验证

自动测试应覆盖 manifest 校验、依赖顺序和循环、HTTPS/CORS 限制、内容替换与哈希确认、离线缓存恢复、激活回滚、安全模式、恶意行为 fixture、诊断脱敏以及英文/简体中文键一致性。修改 Extension 后运行前端架构、本地化、测试和生产构建检查。
