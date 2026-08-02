# PWA 対応メモ

- Manifest: `src/app/manifest.ts`
- Service Worker: Serwist (`@serwist/next`) via `src/app/sw.ts` → `public/sw.js`（ビルド時生成）
- オフラインフォールバック: `/~offline`
- データは IndexedDB 依存のため、初回オンライン取得後はオフラインでもメモ作成・履歴・テーマ・設定が利用可能
- 開発時は Serwist 無効（`NODE_ENV=development`）。本番確認は `bun run build && bun run start`
- Next.js 16 の Turbopack では Serwist の webpack プラグインが使えないため、`build` は `--webpack` を指定
