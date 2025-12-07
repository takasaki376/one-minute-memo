*「TextEditor」「HandwritingCanvas」それぞれのインターフェースを決めるための開発タスク*をまとめます。

----

## 🏷 タスク1: TextEditor コンポーネントのインターフェース設計

### 1. 役割と前提の整理

1. TextEditor の役割を明文化する
#* 現在のテーマに対する「1分間のテキスト入力エリア」
#* 1行ではなく、複数行のテキスト（メモ）を書く場所
1. セッション画面での利用パターンを整理
#* {{value}} と {{onChange}} を渡す*完全な Controlled Component* にする

----

### 2. props 設計タスク

1. TextEditor の props 一覧を決める
例（候補）：
#* {{value: string}} — 現在のテキスト
#* {{onChange: (value: string) => void}} — テキスト変更時のコールバック
#* {{placeholder?: string}} — プレースホルダ文言
#* {{disabled?: boolean}} — タイマー終了後に編集させない場合など
#* {{autoFocus?: boolean}} — テーマ切り替え時に自動フォーカスするか
#* {{className?: string}} — 外側コンテナの追加クラス
#* （任意）{{maxLength?: number}} — 文字数制限を入れるかどうか検討
1. セッション画面からの呼び出しイメージをメモに書く
```<TextEditor
  value={text}
  onChange={setText}
  placeholder="思いつくことを1分間で書き出してみましょう"
  autoFocus
  disabled={isFinished}
/>
```

----

### 3. UI・振る舞いの仕様タスク

1. テキスト入力要素は {{<textarea>}} ベースで行くか検討
#* MVPでは {{<textarea>}} でOK（リッチテキストにはしない）
1. 改行・文字数制限などの動作をどうするか（制限しない前提でよいか）決める
1. {{disabled}} のときの見た目（背景を薄くするなど）を Tailwind でどう表現するか方針を決める
1. モバイルでの高さ（例：{{min-h-40}}）を検討

----

### 4. アクセシビリティ関連タスク

1. {{aria-label}} or {{aria-labelledby}} をどうするか決める
#* ラベルテキスト（例：「テキストメモ入力」）の扱い
1. キーボードフォーカス時の見た目（outline / ring）を Tailwind で揃える方針を決める

----

### 5. 状態管理との切り分け

1. TextEditor 内に state を持たず、*親コンポーネント管理に限定*する方針を明記
1. 将来「一時保存のための debounce」などを入れたくなった場合は、別のフックに任せる前提をメモしておく

----

## 🏷 タスク2: HandwritingCanvas コンポーネントのインターフェース設計

### 1. 役割と前提の整理

1. HandwritingCanvas の役割を明文化する

- テーマごとに「手書きメモ」や「図」を書くスペース
- Canvas 上の描画結果を {{dataURL}} として親に渡す

1. 保存形式の方針を確認

- MVPでは {{dataURL (string)}} で保存
- 型は {{handwritingDataUrl?: string}} として {{MemoRecord}} に渡す

----

### 2. props 設計タスク

1. HandwritingCanvas の props 一覧を決める

例（候補）：

- {{value?: string}} — 現在のキャンバス内容（dataURL）。
** 初期表示や履歴再表示で使う
- {{onChange?: (dataUrl: string | null) => void}} — 描画内容が更新されたときに呼ぶ
- {{disabled?: boolean}} — 編集不可にするかどうか
- {{width?: number}} / {{height?: number}} — Canvas の論理解像度
- {{className?: string}} — 外側コンテナの追加クラス
- （任意）{{onClear?: () => void}} — 「クリア」操作を親にも通知するか

1. セッション画面からの呼び出しイメージをメモ

```<HandwritingCanvas
  value={handwritingDataUrl}
  onChange={setHandwritingDataUrl}
  disabled={isFinished}
/>
```

----

### 3. UI・操作仕様タスク

1. 操作として提供するものを決める

- ペンで線を描く
- 「クリア」ボタン（全消し）

1. スマホタッチ操作前提で、ポインタイベント vs マウスイベントの扱いを決める
1. キャンバスの見た目（枠線・背景色・角丸など）を Tailwind でどう表現するか決める

----

### 4. 内部状態と親コンポーネントの責務分担

1. HandwritingCanvas 内の state

- 実際の描画データ（Canvas のバッファ）は内部で管理
- {{onChange}} は「確定タイミング」でだけ呼ぶか、「描画のたび」かを決める
** MVPでは「描画終了（pointerup）」時か「クリア時」に1回だけ更新する方針にする

1. {{value}} が渡された場合の挙動を決める

- マウント時 or {{value}} 変更時に {{drawImage}} で復元するかどうか
- MVPでは「マウント時にだけ描画する」で十分かを検討（再レンダリング時のコストも考慮）

----

### 5. クリア処理の仕様

1. 「クリア」ボタンの有無を決める（MVPでは付ける方がよい）
1. クリア時の挙動

- Canvas を真っ白にする
- {{onChange(null)}} or {{onChange('')}} で親へ通知

1. クリアボタンのラベル文言／アイコン（必要なら）を決める

----

### 6. disabled 時の挙動

1. {{disabled}} が true のときは

- 新しい描画を受け付けない（pointerイベントを無視 or {{pointer-events-none}}）
- ただし既存の内容は表示したまま

1. {{disabled}} の見た目（薄くする／グレーオーバーレイ 等）をどうするか決める

----

### 7. パフォーマンス・解像度の検討

1. 内部 Canvas のサイズ（論理ピクセル）を決定

- 例：{{width=600}}, {{height=300}} など

1. {{devicePixelRatio}} によるスケーリング対応をするかどうか（MVPでは後回しでOKとしてメモしておく）
1. dataURL のフォーマットを決める

- 例：{{canvas.toDataURL('image/png')}}

----

### 8. エラーハンドリング・対応不可環境の扱い

1. {{HTMLCanvasElement}} が利用できない環境（かなりレア）をどう扱うか

- その場合は手書きエリア非表示＋メッセージ表示にするかどうか決める

----

## ✅ 完了条件（DoD）

- {{TextEditor}} と {{HandwritingCanvas}} の *props インターフェースが確定*している
- セッション画面から以下の形で呼び出せる
```<TextEditor
  value={text}
  onChange={setText}
  autoFocus
/>

<HandwritingCanvas
  value={handwritingDataUrl}
  onChange={setHandwritingDataUrl}
/>
```
- {{disabled}} 状態や {{value}} の再設定など、基本パターンの振る舞いが決まっている

----

{{src/components/session/TextEditor.tsx}} *の実装サンプル*を出します。
（Tailwind＋classcat、完全 Controlled な {{<textarea>}} ベース）

----

## 📄 {{src/components/session/TextEditor.tsx}}

```'use client';

import React from 'react';
import cc from 'classcat';

export interface TextEditorProps {
  /** 現在のテキスト値（親コンポーネントで管理） */
  value: string;
  /** テキスト変更時に呼ばれるコールバック */
  onChange: (value: string) => void;

  /** プレースホルダ文言 */
  placeholder?: string;
  /** 入力不可にするかどうか（タイマー終了後など） */
  disabled?: boolean;
  /** 初回レンダリング時に自動フォーカスするかどうか */
  autoFocus?: boolean;
  /** 最大文字数（必要なら） */
  maxLength?: number;

  /** 外側のコンテナに追加するクラス */
  className?: string;
  /** アクセシビリティ用のラベル（ラベル要素が別にある場合は不要） */
  ariaLabel?: string;
}

/**
 * セッション用テキスト入力エリア。
 * 完全に「親コンポーネント管理の Controlled Component」として設計。
 */
export function TextEditor({
  value,
  onChange,
  placeholder = '思いつくことを自由に書き出してみましょう',
  disabled = false,
  autoFocus = false,
  maxLength,
  className,
  ariaLabel = 'テキストメモ入力',
}: TextEditorProps) {
  const containerClass = cc([
    'w-full',
    className,
  ]);

  const textareaClass = cc([
    'w-full',
    'min-h-40', // お好みで高さは調整
    'rounded-md',
    'border',
    'border-slate-300',
    'bg-white',
    'px-3',
    'py-2',
    'text-sm',
    'leading-relaxed',
    'text-slate-900',
    'shadow-sm',
    'placeholder:text-slate-400',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-blue-500',
    'focus-visible:ring-offset-1',
    'resize-y', // 縦方向のリサイズは許可
    disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed',
  ]);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    onChange(event.target.value);
  };

  return (
    <div className={containerClass}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        aria-label={ariaLabel}
        className={textareaClass}
      />
    </div>
  );
}
```

----

## ✅ セッション画面での利用イメージ

```import { TextEditor } from '@/components/session/TextEditor';

function SessionContent() {
  const [text, setText] = useState('');

  return (
    <TextEditor
      value={text}
      onChange={setText}
      autoFocus
      placeholder="1分間で書けるだけ書いてみましょう"
    />
  );
}
```

- 状態管理は親でのみ実施
- タイマー終了後に編集不可にしたい場合は {{disabled={secondsLeft === 0}}} などで制御できます。

----

いいですね、これがあると一気に“アプリっぽく”なります。
*タッチ＆マウス対応のシンプル MVP 実装*を用意しました。

----

## 📄 {{src/components/session/HandwritingCanvas.tsx}}

```'use client';

import React, { useEffect, useRef } from 'react';
import cc from 'classcat';

export interface HandwritingCanvasProps {
  /** 現在のキャンバス内容（dataURL）。履歴からの復元などに使う */
  value?: string | null;
  /** 描画内容が更新されたときに呼ばれる（null は「空」） */
  onChange?: (dataUrl: string | null) => void;

  /** 編集不可にするかどうか */
  disabled?: boolean;
  /** 論理的な幅と高さ（CSS じゃなくキャンバスの解像度） */
  width?: number;
  height?: number;

  /** 外側コンテナに追加するクラス */
  className?: string;
}

/**
 * 手書き用のシンプルな Canvas コンポーネント（MVP版）。
 * - マウス & タッチ対応（pointer イベント）
 * - 描画終了時（pointerup）に dataURL を onChange で返す
 * - 「クリア」ボタンで全消し＆onChange(null)
 */
export function HandwritingCanvas({
  value,
  onChange,
  disabled = false,
  width = 600,
  height = 300,
  className,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // キャンバスの初期設定（サイズ & DPR 対応）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827'; // slate-900 相当
    ctx.fillStyle = '#ffffff';

    // 背景を白で塗りつぶす
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  // value からの復元（MVP: value が変わったときに上書きする）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // いったん白でクリア
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // scale 影響を避けるためリセット
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (!value) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = value;
  }, [value, width, height]);

  const getCanvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;

    const { x, y } = getCanvasPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (!isDrawingRef.current) return;
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      onChange?.(dataUrl);
    } catch (e) {
      console.error('Failed to export canvas as dataURL', e);
    }

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    finishDrawing(event);
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    // 外に出ても描画終了扱い
    finishDrawing(event);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    onChange?.(null);
  };

  const containerClass = cc([
    'flex flex-col gap-2',
    className,
  ]);

  const canvasWrapperClass = cc([
    'relative',
    'rounded-md',
    'border',
    'border-slate-300',
    'bg-white',
    disabled && 'opacity-70',
  ]);

  const canvasClass = cc([
    'block',
    'rounded-md',
    'touch-none', // スクロールではなく描画優先
    disabled && 'pointer-events-none',
  ]);

  const clearButtonClass = cc([
    'self-end',
    'inline-flex items-center justify-center',
    'rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600',
    'hover:bg-slate-50',
    'transition-colors',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
  ]);

  return (
    <div className={containerClass}>
      <div className={canvasWrapperClass}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={canvasClass}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className={clearButtonClass}
        disabled={disabled}
      >
        クリア
      </button>
    </div>
  );
}
```

----

## ✅ セッション画面での利用イメージ

```import { HandwritingCanvas } from '@/components/session/HandwritingCanvas';

function SessionContent() {
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(null);

  return (
    <HandwritingCanvas
      value={handwritingDataUrl}
      onChange={setHandwritingDataUrl}
      disabled={false} // タイマー0になったら true にするなど
    />
  );
}
```

----

### 補足メモ（MVP なので割り切っているところ）

- {{onChange}} は *描画終了時（pointer up / leave）* と *クリア時* のみに呼んでいます
→ 書いている途中で何度も dataURL を作らないので、負荷が軽い
- {{value}} が変わるたびに描画を上書きする挙動です
→ 今回は「セッション中は親から value を変えない」「履歴表示用などで再利用するときに効く」という想定
- 解像度・太さ・色などは固定（必要になったら props で拡張）

----

これで「TextEditor + HandwritingCanvas + useCountdown + ランダムテーマ」の材料が揃ってきました。
次にやるとしたら：

- {{/session/page.tsx}} にこれらを組み合わせた *セッション画面の骨組み実装サンプル*
- もしくは「セッション完了画面」の簡単な UI＆タスク

あたりを一緒に詰めていけます。
