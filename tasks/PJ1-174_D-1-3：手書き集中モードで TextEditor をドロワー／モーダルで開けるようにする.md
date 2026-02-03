## 概要

手書き集中モード（handwritingFocus）中でもテキスト入力ができるように、
TextEditor を **ドロワー/モーダル（オーバーレイ）で開閉できる UI** を実装する。

Canvas を最大化したまま、必要なときだけ TextEditor を呼び出せる状態を提供する。

---

## 背景 / 目的

- 集中モードでは Canvas を最大化するため、常時 TextEditor を表示しない
- ただし「少しだけ文章も残したい」ニーズがある
- 画面スペースを奪わず、入力体験を壊さない形で TextEditor を提供したい
- TextEditor を開閉しても
  - 手書き内容
  - テキスト内容
  - タイマー状態
    が失われないことが重要

---

## 対象画面 / ファイル

- 画面: `/session`
- 想定ファイル:
  - `src/app/session/page.tsx`
  - `src/components/session/TextEditor.tsx`
  - `src/components/ui/*`（モーダル/ドロワー用）
- UI方式（どちらでも可）:
  - ドロワー（右/下からスライド）
  - モーダル（中央表示）
  - シート（下から出る）

---

## スコープ（やること）

### 1) Open/Close 状態の追加

- 集中モード時のみ使う open state を持つ
  - 例: `const [isTextOpen, setIsTextOpen] = useState(false)`
- `viewMode !== 'handwritingFocus'` のときは state をリセットしてもよい（任意）

### 2) TextEditor 呼び出しボタンの追加（集中モードのみ）

- 置き場所:
  - ヘッダー右側
  - もしくは Canvas 上のフローティングボタン（FAB）
- UI要件:
  - md以上のみ表示
  - `aria-label` 付き
  - 現在開いている状態が分かる（Close アイコンなど）

### 3) ドロワー/モーダルの実装

- TextEditor をオーバーレイ内に配置する
- 開閉要件:
  - 開く：ボタン押下
  - 閉じる：×ボタン / 背景クリック / ESC（任意）
- スクロール:
  - TextEditor 側でスクロール可能
  - 背面（Canvas）へのスクロール干渉を抑える

### 4) 状態保持（最重要）

- ドロワー/モーダルの開閉で以下が失われないこと
  - TextEditor の入力内容（state）
  - HandwritingCanvas の描画内容
  - タイマー状態（進行/残秒）
- 避けるべきこと:
  - TextEditor を開くたびに再マウントして初期化
  - Canvas を再マウントして描画が消える

### 5) 入力干渉の抑制

- TextEditor を開いている間は、
  Canvas 側の pointer 操作が誤って入らないこと（望ましい）
  - 例: オーバーレイが背面入力を遮断する
- ソフトウェアキーボード表示時にレイアウトが破綻しない

---

## 非スコープ（やらないこと）

- TextEditor の新機能追加（Markdown等）
- 入力内容の自動整形
- モード切替の永続化
- 手書きツール追加（ペン太さ/消しゴム等）

---

## 完了条件（Definition of Done）

- 集中モードで TextEditor を開閉できる
- 開閉しても Canvas / Text / タイマーの状態が保持される
- オーバーレイ表示中、入力が安定してできる
- 閉じる導線が明確で、操作が迷わない
- スマホでは本機能が露出しない（md以上のみ）

---

## 受け入れ確認（手動）

- タブレット相当サイズで集中モード → TextEditor を開ける
- TextEditor に入力 → 閉じる → 再度開くで入力が残っている
- TextEditor 開閉で Canvas の描画が消えない
- タイマーが継続して進む（または仕様通りに動く）
- オーバーレイ中に Canvas が誤反応しない

---

## 実装メモ

- 既存 UI ライブラリが無い場合は、最小の Drawer/Modal を自作でも可
  - `fixed inset-0` の backdrop + `fixed` の panel で実装可能
- state の置き場所は SessionPage 側に寄せ、
  TextEditor は “表示/入力” に専念させる
- オーバーレイは pointer events を遮断し、背面入力を止める（`pointer-events`）
