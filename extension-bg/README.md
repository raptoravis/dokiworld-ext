# Background Customizer for DokiWorld

[简体中文](README.zh-CN.md)

A standalone third-party DokiWorld UI Extension that changes the page background. It supports an HTTPS image URL, base color, overlay color/opacity, image sizing, positioning, enable/disable, and reset. Settings are stored only in this browser through the SDK's namespaced `context.storage.localStore` API.

## SDK usage demonstrated

This project deliberately uses the public `@dokiworld/extension-sdk` as an authoring example:

- `src/index.js` imports `EXTENSION_API_VERSION` and `EXTENSION_CONTRACT_VERSION`, checks the versioned Chat Header Slot context, and uses `context.ui.slots`, `context.subscriptions`, `context.storage.localStore`, `context.i18n`, and `context.logger`.
- `tests/background.test.mjs` uses `@dokiworld/extension-sdk/testing` to create an in-memory public Extension Host context instead of importing DokiWorld frontend internals.
- `scripts/build.mjs` bundles the SDK import into the single browser ESM file declared by `manifest.json`; published packages therefore contain no unresolved bare module imports.

## Try it

```powershell
npm install
npm run serve
```

Open DokiWorld's `/extensions` page and load `http://localhost:4173/manifest.json`.

Optional project checks are available through `npm test`, `npm run validate`, `npm run hash`, and `npm run conformance` after building the package.

The source is independent from DokiWorld's `frontend/src/extensions/builtin/` directory and uses only the public Extension SDK and Host API.

## SDK dependency source

The project uses `@dokiworld/extension-sdk@^1.0.1` from the public npm registry by default. When developing an unpublished SDK change, it can temporarily use a sibling checkout of `dokiworld.git`:

```json
{
  "devDependencies": {
    "@dokiworld/extension-sdk": "file:../../dokiworld.git/packages/extension-sdk"
  }
}
```

Run `npm install` after changing the dependency so that `package-lock.json` and `node_modules` use the local package. This path assumes `dokiworld-exts.git` and `dokiworld.git` are adjacent directories.

Before committing or publishing extension-bg, restore the public package and refresh the lockfile:

```powershell
npm install "@dokiworld/extension-sdk@^1.0.1" --save-dev
```
