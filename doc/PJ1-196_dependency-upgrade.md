# PJ1-196 依存アップデートメモ（v3 / Bun 前提）

旧 PR #60 は Yarn 時代の `yarn.lock` 差分のまま develop（Bun 移行後）へ rebase できないため close し、`feat/PJ1-196-next-ts-upgrade-v2`（PR #62）でやり直した。#62 はレビュー前に誤マージされたため PR #63 で revert し、本ブランチ `feat/PJ1-196-next-ts-upgrade-v3` で同じ変更を再提出する。

## 採用バージョン

| パッケージ | 版 |
| --- | --- |
| next | `16.3.0` |
| eslint-config-next | `16.3.0` |
| typescript | `7.0.2` |
| @typescript/typescript6 | `6.0.2`（ESLint 用 Compiler API） |

## TypeScript 7 対応の要点

Next.js 16.3 は `experimental.useTypeScriptCli` により TypeScript 7 の `tsc` CLI で型チェックできる。

```ts
// next.config.ts
experimental: {
  useTypeScriptCli: true,
},
```

これにより `bun run build` の TypeScript 工程は TS7 ネイティブコンパイラ経由になる。

## ESLint（typescript-eslint）について

`typescript-eslint`（eslint-config-next 経由）は **TypeScript 7.0 の Compiler API 非対応**（peer は `<6.1.0`、追跡: [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)）。TS 7.1 以降の新 API 待ち。

そのため本リポジトリでは次の side-by-side を採る。

- プロジェクトの `typescript` = **7.0.2**（`tsc` / Next 型チェック）
- `@typescript/typescript6` = **6.0.2**（ESLint が要する TS6 API）
- `bun run lint` は `scripts/resolve-ts6-for-eslint.cjs` で `require('typescript')` を TS6 に差し替えて実行

公式ブログの npm alias（`typescript` → `@typescript/typescript6`）は **Bun では `require('typescript')` が空オブジェクトになり破綻**したため、上記フック方式を採用した。

## 検証結果

- `bun run lint` — エラー 0（既存 warning のみ）
- `bun run typecheck` — 成功（TS7）
- `bun run test --run` — 29 files / 216 tests
- `bun run build` — 成功（TS 工程 ~0.8s 前後）
- E2E — 実施結果を PR に記載

## 補足

- TypeScript 7 はプラットフォーム別ネイティブバイナリ（`@typescript/typescript-<os>-<arch>`）を optional 依存として解決する。Apple Silicon 上で x64 の Bun/Node（Rosetta）と arm64 の Node が混在すると解決先がずれることがある。開発は `mise install` 後の同一ツールチェーンで揃えること。
