## タイトル
Next.js 16.2系およびTypeScript 7系へのアップデートと関連依存の整合対応

## 種別
Task

## 背景
- 現在、依存定義は package.json にあり、主要バージョンは Next.js 16.0.7系、TypeScript 5系。
- Next.jsを16.2系、TypeScriptを7系へ更新したい。
- 主要フレームワーク更新に伴い、Lint・型定義・テスト基盤の互換性確認が必要。

## 現状確認メモ
- Next.js: 16.0.7系（package.json）
- eslint-config-next: 16.0.3固定（package.json）
- TypeScript: 5系（package.json）
- React/React DOM: 19.2.1系（package.json）
- Node固定: 20.20.0（Volta、package.json）
- ロックファイル: yarn.lock

## 目的
- Next.jsを16.2系へ更新し、開発・ビルド・テストが通る状態にする。
- TypeScriptを7系へ更新する。もし7系が未提供または主要依存が未対応の場合は、互換性を満たす最新安定版へ代替し、判断理由を記録する。

## スコープ
- 依存更新
- 互換性検証
- 必要な設定微修正
- 回帰テスト実施
- 変更記録（影響・判断理由）

## 対応内容
1. 依存アップデート
- next を 16.2系へ更新
- eslint-config-next を next と同一メジャー/同等マイナーへ追随
- typescript を 7系へ更新トライ
- TypeScript 7系非対応時の代替:
	- Next.js 16.2系と互換性のあるTypeScript最新安定版へ変更
	- Jiraコメントに「7系採用不可の根拠（peer依存・ビルド/型エラー）」を残す
- 必要に応じて以下を追随更新
	- eslint
	- @types/react
	- @types/react-dom
	- @types/node
	- vitest / jsdom / @testing-library系（TypeScriptメジャー変更で型崩れ時のみ）

2. ロックファイル更新
- yarn install実行により yarn.lock を更新

3. 検証
- lint実行
- 型チェック（tsc noEmit相当）
- 単体/コンポーネントテスト（Vitest）
- E2E主要シナリオ（少なくともsession/history/settings/themes）
- 開発起動および本番ビルド確認

4. 影響調査・ドキュメント
- 破壊的変更（Next.js 16.2系・TypeScript更新）の有無確認
- 必要なら移行メモを doc 配下へ追加
- 既知制約・回避策をJiraに記録

## 完了条件（Acceptance Criteria）
- next が16.2系に更新されている
- typescript が7系、または7系不可の場合は合意済み代替版に更新されている
- eslint-config-next が next と整合する版になっている
- yarn.lock が更新されている
- lint、型チェック、Vitest、主要E2Eが成功
- ローカル起動と本番ビルドが成功
- 互換性判断結果（特にTypeScript 7系可否）がJiraに明記されている

## 想定リスク
- TypeScript 7系が未提供またはNext.js 16.2系/周辺ツール未対応の可能性
- ESLint設定や型定義の微妙な不整合によるCI失敗
- テストユーティリティの型エラー増加

## 優先度
High

## 見積
- 調査＋更新: 0.5日
- 不整合修正＋検証: 0.5日
- 合計: 1.0日（TypeScript 7系非対応時の切り分けで+0.5日の可能性）

## 実施メモ（作業者向け）
- 先に Next.js と eslint-config-next を揃えて更新
- 次に TypeScript を上げ、型エラー傾向を確認
- 最後に周辺依存の最小追随更新で収束させる
