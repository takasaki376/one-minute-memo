Next.js の不具合を修正し、安心して開発・運用を続けられる状態にします。
影響範囲を確認しながら、必要な依存更新と回帰確認を行います。

---

## 📝 タスク名

*Next.js の不具合修正に向けたバージョンアップ*（{{package.json}}、{{bun.lock}}）

---

## 1. 背景・目的

1. Next.js の不具合が見つかったため、修正版へのバージョンアップを行う。
2. 現在の {{package.json}} では {{next}} と {{eslint-config-next}} を {{16.3.0}} に固定している。
3. 発見された不具合の識別情報と修正版のバージョンが未記載のため、更新前に公式情報を確認し、適切な更新先を決定する。
4. 更新による既存機能や開発ツールへの影響を確認し、必要な修正と回帰テストを行う。

---

## 2. 不具合と更新先の確認

1. 発見された不具合の内容、再現条件、Issue/CVE 等の識別情報を確認する。
2. Next.js の公式リリースノート、アドバイザリ、修正情報を確認し、対象不具合が解消される最小の修正版を特定する。
3. {{next}} と {{eslint-config-next}} の互換性を確認し、更新後の組み合わせを決定する。
4. 更新先に破壊的変更や追加対応がある場合は、対象範囲と対応内容を明確にする。

---

## 3. 依存関係の更新

1. {{next}} と {{eslint-config-next}} を確認した修正版へ更新する。
2. Bun を使用して {{bun.lock}} を更新し、ロックファイルと {{package.json}} の整合性を保つ。
3. 他の依存パッケージは、不具合修正または互換性維持に必要な場合に限って更新する。
4. 設定変更や移行作業が必要な場合は、変更理由と影響範囲を記録する。

---

## 4. 動作確認・回帰テスト

1. {{bun run lint}}、{{bun run typecheck}}、{{bun run test}} を実行する。
2. {{bun run build}} を実行し、本番ビルドが成功することを確認する。
3. 不具合の再現条件がある場合は、更新後に解消したことを確認する。
4. Next.js の変更が影響する主要画面・API Route を確認し、必要に応じて {{bun run test:e2e}} を実行する。
5. 実行した検証コマンドと結果をチケットまたは PR に記録する。

---

## 5. 完了条件（DoD）

- 対象不具合と修正版のバージョンが公式情報に基づいて特定されている。
- {{next}} と {{eslint-config-next}} が互換性のある修正版へ更新され、{{bun.lock}} に反映されている。
- 不具合の再現条件がある場合、更新後に解消を確認できている。
- lint、型チェック、テスト、本番ビルドが成功している。
- 更新に伴う追加変更と検証結果が記録されている。

---

## 6. 実施結果

### 対象と更新先

16.3.0 には、公式の 2026-09 セキュリティリリース（修正版 16.3.8）と 2026-10-14 の追加修正（[Next.js Security Update](https://nextjs.org/blog/nextjs-security-update-october-14-2026)、修正版 16.4.1）が未適用。16.4.2 / 16.4.3 はその修正を含むバグフィックスのバックポート。更新先は最新の **16.4.3**（`eslint-config-next` も同版）。

16.4.1 で塞がれる主な項目:

- `use cache` が複数の typed array を返す場合の未認証 RCE（GHSA-673q-mjm6-r5xr）
- Image Optimization の SVG 経由の未認証 RCE（CVE-2026-96889 / GHSA-2464-fhr4-w9xw）
- Server Actions への細工リクエストによる DoS（GHSA-p3m5-59mp-jv5r）

このアプリは Cache Components、`next/image` のリモート最適化、Server Actions を使っていない。再現条件はなく、修正版へ上げることで同一系統の欠陥を避ける。

16.4 の Cache Components は既存アプリでは任意。`cacheComponents` は有効にしていない。`experimental.useTypeScriptCli` は 16.4 で既定が有効だが、TypeScript 7 の `tsc` を明示するため設定は残した。

### 互換のための追加変更

- `eslint-config-next@16.4.3` の typescript-eslint は TypeScript 7 を読み込むと即失敗する。`bun run lint` で既存の `scripts/resolve-ts6-for-eslint.cjs` を読むようにした。
- `react-hooks/set-state-in-effect` により、セッション復元の effect から同期 `setState` できなくなった。取得結果の反映は Promise のコールバックに移した。
- `SyncRunData` の空 interface を type alias にした（`@typescript-eslint/no-empty-object-type`）。
- e2e の同期シナリオがセッション応答の `configured` を欠いていたため、ログイン済みモックに `configured: true` を足した。

### 検証

- `bun run lint` — エラー 0（既存 warning 9）
- `bun run typecheck` — 成功
- `bun run test` — 成功
- `bun run build` — Next.js 16.4.3 (webpack) で成功
- `bun run test:e2e` — 21 件成功（同期シナリオのモック修正後）
