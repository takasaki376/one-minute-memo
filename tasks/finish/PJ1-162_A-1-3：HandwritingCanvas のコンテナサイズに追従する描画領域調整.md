## 概要

/session のタブレット向け2ペインレイアウト導入に伴い、
HandwritingCanvas が **親コンテナのサイズ（幅/高さ）に追従して描画領域を適切に更新**できるよう調整する。

画面回転（縦/横）やリサイズ時に、キャンバスが欠けたり、座標がずれたりしない状態を担保する。

---

## 背景 / 目的

- タブレット向けに Canvas を大きく配置すると、コンテナサイズが動的になりやすい
- 現状の実装によっては以下が起きがち
  - Canvas が固定サイズのままで余白が出る/欠ける
  - 画面回転後に描画位置がずれる
  - 見た目の拡大縮小（CSS）だけで実ピクセルが追従せず、線がぼやける
- Canvas は **表示サイズ（CSS）と内部解像度（canvas.width/height）** を一致させる必要がある

---

## 対象画面 / ファイル

- 画面: `/session`
- 想定ファイル:
  - `src/components/session/HandwritingCanvas.tsx`
  - （必要なら）Canvas を包むレイアウト側コンテナ（/session page）

---

## スコープ（やること）

### 1) 親コンテナサイズ計測の導入

- Canvas の親要素（wrapper）のサイズを取得できるようにする
- 推奨手段:
  - `ResizeObserver` で wrapper の `contentRect.width/height` を監視
  - fallback として `window.resize` を補助的に使う（必要なら）

### 2) Canvas の内部解像度を表示サイズに追従させる

- wrapper の width/height を元に、以下を更新する
  - `canvas.style.width/height`（見た目）
  - `canvas.width/height`（内部解像度）
- 高DPI対応（推奨）:
  - `devicePixelRatio` を考慮し、内部解像度を `cssSize * dpr` にする
  - その上で `ctx.scale(dpr, dpr)` などで座標系を合わせる

### 3) リサイズ/回転時の描画保持方針を決める

- MVPとして必須なのは「欠けずに書けること」
- 既存ストロークを保持できるなら理想だが、実装コストが上がるため方針を明確化する
  - 方針A（推奨・現実的）: リサイズ時に既存描画を保持する（オフスクリーンに退避して復元）
  - 方針B（MVP簡易）: リサイズ時はクリア（ただしUX影響大なので基本はA推奨）
- どちらを採用したかをチケット内に明記する

### 4) 入力座標のズレを防ぐ

- pointer/touch 座標 → canvas 座標への変換が
  - CSSサイズ
  - DPR
  - canvas.width/height
    と矛盾しないことを確認する
- 変換は `getBoundingClientRect()` を基準に行う

### 5) 見た目品質の担保（ぼやけ防止）

- DPR対応により線が滲まないことを確認する
- 可能なら `ctx.lineCap/lineJoin` 等の既存設定を維持する

---

## 非スコープ（やらないこと）

- ペン太さ/消しゴム/Undo などの機能追加
- ストロークのベクターデータ保存（将来の拡張）
- 画面全体のレイアウト変更（A-1-1 が担当）
- 手書き集中モード（別Story）

---

## 完了条件（Definition of Done）

- タブレット2ペインで Canvas がコンテナサイズに追従して表示される（余白/欠けがない）
- 画面回転（縦/横）やウィンドウリサイズで描画領域が正しく更新される
- 入力座標がずれない（書いた位置に線が出る）
- 高DPI端末で線がぼやけにくい（DPR対応）
- セッション進行（保存/次テーマ/完了）に影響がない

---

## 受け入れ確認（手動）

- iPad相当サイズで Canvas が領域いっぱいに表示される
- 縦→横、横→縦の回転で Canvas が追従する
- 回転後も描画位置がズレない
- 線が極端にぼやけない

---

## 実装メモ

- ResizeObserver で wrapper サイズを監視し、Canvas のサイズを更新する
- DPR対応例（概念）:
  - cssW/cssH を取得
  - dpr = window.devicePixelRatio || 1
  - canvas.width = cssW _ dpr; canvas.height = cssH _ dpr
  - canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`
  - ctx.setTransform(dpr, 0, 0, dpr, 0, 0) で座標系を揃える
- リサイズ時の描画保持を行う場合は、resize前に bitmap を退避して復元する
  - 例: `createImageBitmap(canvas)` / offscreen canvas を利用
