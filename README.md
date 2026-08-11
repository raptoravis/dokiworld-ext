# dokiworld-ext

The game and World apps consume the public `@dokiworld/app-sdk` package, use `createAppClient` with `dokiworld.app/2`, and bundle the SDK into their static artifacts. The World apps use `createAppHost` when they open a nested game. Build each app before publishing:

Each App publishes its provider metadata as `manifest.json`. DokiWorld still accepts the legacy `game.json` filename for existing packages.

```sh
npm install --prefix game-match3 && npm run build --prefix game-match3
npm install --prefix banquet-contract && npm run build --prefix banquet-contract
npm install --prefix storyteller && npm run build --prefix storyteller
```
