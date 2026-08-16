# PJ1-198: Bun + Vitest ハイブリッドテスト

## 方針

| ランナー | 対象ファイル | 用途 |
| --- | --- | --- |
| Bun (`bun test`) | `src/**/*.bun.test.ts` | DOM 非依存の純粋ユニット |
| Vitest | `src/**/*.test.ts(x)`（`*.bun.test.*` 除外） | React / Testing Library / `vi.mock` 前提 |
| Playwright | `e2e/**` | E2E（本チケット対象外） |

`bun run test` = `test:bun` → `test:vitest` の順次実行。

## 分類基準

**Bun へ寄せる**

- `vitest` / Testing Library / jsdom に依存しない
- モジュールモック（`vi.mock`）が不要な純粋関数・変換ロジック

**Vitest に残す**

- `*.test.tsx`（コンポーネント / ページ）
- `renderHook` を使う hooks / timer
- IndexedDB まわりの `vi.mock("../openDB")` など重いモック依存

## 設定

- `bunfig.toml`: `e2e/**` などを ignore（意図しない拾い上げ防止）
- `vitest.config.ts`: `**/*.bun.test.ts(x)` を exclude（二重実行防止）
- `test:bun` は `scripts/run-bun-tests.ts` で `src/` 配下の `*.bun.test.ts` / `*.bun.test.tsx` を列挙し、一致ファイルだけを `bun test` する
- Bun テストの型は `@types/bun`（`bun:test`）で解決する

## 検証（作業時）

```bash
bun run test:bun
bun run test:vitest
bun run test
```
