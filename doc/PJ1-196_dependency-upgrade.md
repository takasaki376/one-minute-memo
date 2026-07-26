# PJ1-196 依存アップデートメモ

## 採用バージョン

- Next.js: `16.2.12`
- eslint-config-next: `16.2.12`
- TypeScript: `6.0.3`
- typescript-eslint: `8.65.0`（Yarn resolutions で固定）

## TypeScript 7を採用しなかった理由

TypeScript `7.0.2`で検証した結果、次の非互換が確認されたため採用を見送った。

- Next.jsの本番ビルドが、TypeScript 7に必要なCompiler APIがないとして失敗する
- eslint-config-nextが使用するtypescript-eslintの旧バージョンがTypeScript 7に未対応で、lint実行時に例外が発生する
- 最新のtypescript-eslint `8.65.0`も対応範囲がTypeScript `<6.1.0`であり、TypeScript 7は対象外

Next.js 16.2.12が案内する代替版かつtypescript-eslintの対応範囲内である、最新のTypeScript 6系安定版 `6.0.3`を採用した。

## 補足

- typescript-eslint `8.65.0`はNode.js `^20.19.0`以降を要求する
- このリポジトリはVoltaでNode.js `20.20.0`を指定しているため要件を満たす
- Next.js 16.2で追加されたlintルールに合わせ、生成済みService Workerの除外と既存コードの最小修正を行った
