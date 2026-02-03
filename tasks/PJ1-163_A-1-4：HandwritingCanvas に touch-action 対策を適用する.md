## 概要

タブレット端末での手書き入力体験を向上させるため、
HandwritingCanvas に対して **touch-action 制御を適用**し、
手書き中の意図しないスクロール・ズームなどの誤動作を抑制する。

---

## 背景 / 目的

- タブレット（特に iPad / iPadOS Safari）では、
  指やペンで Canvas 上に描画している最中に以下が起きやすい
  - ページ全体がスクロールしてしまう
  - ピンチ操作と誤認されズームが入る
- これにより、手書き入力が中断され、思考の流れが阻害される
- Canvas 上では **ブラウザのデフォルトジェスチャーを無効化**し、
  描画操作を最優先にする必要がある

---

## 対象画面 / ファイル

- 画面: `/session`
- コンポーネント:
  - `src/components/session/HandwritingCanvas.tsx`
- 影響範囲:
  - Canvas 要素、および必要に応じてそのラッパー要素

---

## スコープ（やること）

### 1) touch-action の適用

- Canvas 要素に以下を適用する
  - `touch-action: none;`
- 方法は以下のいずれでも可
  - インラインスタイル
  - Tailwind クラス（例: `touch-none`）
  - CSS クラス定義

### 2) pointer / touch イベントとの整合性確認

- `pointerdown / pointermove / pointerup`
  または
  `touchstart / touchmove / touchend`
  を使用している場合、
  - `touch-action` の指定と競合しないことを確認する
- 必要に応じて `event.preventDefault()` の使用可否を確認
  - pointer events 使用時は `touch-action` が優先されるため、
    過剰な preventDefault は避ける

### 3) Canvas 以外のスクロールは維持する

- Canvas 外の UI（TextEditor 等）は、
  これまで通りスクロール可能であること
- ページ全体に touch-action をかけないこと（Canvas限定）

---

## 非スコープ（やらないこと）

- スクロールロックの全画面適用
- ジェスチャー操作（ピンチズーム等）の独自実装
- iOS 専用の UA 判定分岐
- 手書きツール機能の追加

---

## 完了条件（Definition of Done）

- Canvas 上で手書き中にページスクロールが発生しにくい
- ピンチ操作などが誤って発動しない
- Canvas 外（TextEditor 等）は通常通りスクロールできる
- スマホ/PC の既存操作に悪影響がない

---

## 受け入れ確認（手動）

- iPad 相当サイズで Canvas 上を指/ペンでなぞっても画面がスクロールしない
- Canvas 外をスワイプすると通常通りスクロールする
- セッション進行（描画 → 保存 → 次テーマ → 完了）が問題なく行える

---

## 実装メモ

- Tailwind 使用例:
  - `<canvas className="touch-none" />`
- React inline style 例:
  - `<canvas style={{ touchAction: 'none' }} />`
- pointer events を使用している場合、
  touch-action が最も重要な制御ポイントになるため、
  不要な `preventDefault()` は入れすぎないこと
