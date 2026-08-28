# PJ1-197: Bun + mise 移行メモ

## 方針

| 項目 | 採用 |
| --- | --- |
| パッケージ管理 / スクリプト実行 | Bun (`bun install` / `bun run …`) |
| バージョン管理 | mise（`mise.toml`） |
| ロックファイル | `bun.lock` のみ（`yarn.lock` は削除） |
| Volta | 撤去（`package.json` の `volta` フィールド削除） |

将来の CI / CD でも **Bun + mise** を標準実行環境とする。

## バージョン固定

- Bun: `1.4.0`（`packageManager` / `mise.toml` で一致）
- Node: `20.20.2`（互換性保険。Playwright 等の Node CLI 向けに残す）

## 既知の注意点

- Playwright のブラウザはローカルの `postinstall` で Chromium を入れる（`bunx playwright`）。**Vercel では `VERCEL` 環境変数を見てスキップ**する（本番ビルドにブラウザは不要で、Bun では `playwright: command not found` になるため）。
- 手動インストール: `bunx playwright install chromium`
- Vitest / Bun ハイブリッドは **PJ1-198**（`bun run test` = Bun 対象 → Vitest 対象）。詳細は `doc/PJ1-198_bun-vitest-hybrid.md`。
- Next.js の本番ビルドは既存どおり `--webpack`（Serwist 制約）。
- 一部環境で Bun の AVX 警告が出ることがある。mise 経由インストールは baseline ビルドを使うため通常は問題ないが、クラッシュする場合は公式の `*-baseline` バイナリを確認する。
- lint エラー無しを確認済み（既存 warning は残る）。`public/sw.js` は生成物のため ESLint 対象外。
- **`bun.lock` は `yarn.lock` からの自動移行版を使わないこと。** 移行版は依存の解決先がレジストリの tarball URL 形式になり、`node_modules/.bin` にバイナリがリンクされず、クリーン環境で `next: command not found` になる（Vercel のビルド失敗要因）。`bun.lock` を作り直す場合は `rm -rf node_modules bun.lock && bun install`。

## 検証コマンド

```bash
mise install
bun install
bun run lint
bun run test
bun run test:e2e
bun run build
```
