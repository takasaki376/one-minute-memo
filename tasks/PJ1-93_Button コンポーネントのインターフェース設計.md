## 🎯 方針

- 共通の Button を *1つだけ* 用意して、画面ごとにバラバラなスタイルにしない。
- よく使いそうな軸だけに絞る：
** {{variant}}: 表現（primary / secondary / ghost）
** {{size}}: 大きさ（sm / md / lg）
** {{isLoading}}: ローディング中（クリック無効・スピナー表示など）
** {{href}}: 渡されたときだけ {{<Link>}} にする（それ以外は {{<button>}}）
- 複雑な {{asChild}} パターンは *今はナシ*（必要になったら拡張）。

----

## 🧱 プロパティ設計

### 基本インターフェース

```// src/components/ui/Button.tsx

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;

  /** 見た目のバリエーション */
  variant?: ButtonVariant; // default: 'primary'

  /** サイズ */
  size?: ButtonSize; // default: 'md'

  /** type属性（form内で使う時） */
  type?: 'button' | 'submit' | 'reset';

  /** クリックハンドラ（hrefと併用しない前提） */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;

  /** ボタン無効化 */
  disabled?: boolean;

  /** ローディング中表示＆クリック無効 */
  isLoading?: boolean;

  /** リンクとして使う場合のURL。指定時は <Link><a></a></Link> を返す */
  href?: string;

  /** フル幅にするかどうか */
  fullWidth?: boolean;

  /** 左アイコン・右アイコン（必要なら） */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  /** aria-label など追加属性を渡すための拡張用 */
  className?: string;
}
```

----

## 🎨 スタイルの考え方（Tailwind 前提）

内部では、{{variant}} / {{size}} ごとにクラスを組み立てます。

### variant のイメージ

- {{primary}}
** メインアクション用（セッション開始ボタンなど）
** 例: {{bg-blue-600 text-white hover:bg-blue-700}}
- {{secondary}}
** サブアクション用
** 例: {{border border-slate-300 bg-white hover:bg-slate-50}}
- {{ghost}}
** 枠線も背景も弱い、テキストリンクに近い
** 例: {{bg-transparent hover:bg-slate-100}}

### size のイメージ

- {{sm}}: {{text-sm px-3 py-1.5}}
- {{md}}: {{text-sm px-4 py-2}}
- {{lg}}: {{text-base px-5 py-2.5}}

----

## 🔗 Link と Button の切り替え方針

- {{href}} が *ある場合*
→ {{<Link href={href}>}} の中で {{<a>}} or {{<button role="link">}} をラップ
- {{href}} が *ない場合*
→ 通常の {{<button>}} をレンダリング

シンプルにやるなら：

```if (href) {
  return (
    <Link href={href} className={classes} aria-disabled={disabled || isLoading}>
      {content}
    </Link>
  );
}

return (
  <button
    type={type ?? 'button'}
    onClick={disabled || isLoading ? undefined : onClick}
    disabled={disabled || isLoading}
    className={classes}
  >
    {content}
  </button>
);
```

----

## ⏳ isLoading の振る舞い

- {{isLoading === true}} のとき：
** {{disabled}} と同じ扱い（クリック不可）
** 中身は：{{スピナー + children}} か {{スピナーのみ}}
- ざっくりした仕様：
** {{disabled || isLoading}} の場合は {{cursor-not-allowed opacity-60}} などを付与する

----

## ✅ この Button でできること

- トップ画面：
** 「セッションを開始」＝ {{variant="primary" size="lg" fullWidth}}
** 「履歴を見る」＝ {{variant="secondary"}}
- セッション画面：
** 「次のテーマへ（テスト用）」など {{variant="ghost"}}
- ローディング：
** Supabase 同期が将来入ったときに {{isLoading}} だけで対応可能

----

## 実装サンプル

```'use client';

import React from 'react';
import Link from 'next/link';
import cc from 'classcat';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  isLoading?: boolean;
  href?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  isLoading = false,
  href,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const classes = cc([
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    variant === 'primary' &&
      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    variant === 'secondary' &&
      'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-300',
    variant === 'ghost' &&
      'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
    size === 'sm' && 'text-sm px-3 py-1.5',
    size === 'md' && 'text-sm px-4 py-2',
    size === 'lg' && 'text-base px-5 py-2.5',
    isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none',
    fullWidth && 'w-full',
    className,
  ]);

  const content = (
    <>
      {isLoading && (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {!isLoading && leftIcon && (
        <span className="mr-2 inline-flex">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && (
        <span className="ml-2 inline-flex">{rightIcon}</span>
      )}
    </>
  );

  // Linkとして使う場合
  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={isDisabled}
      >
        {content}
      </Link>
    );
  }

  // buttonとして使う場合
  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={classes}
    >
      {content}
    </button>
  );
}

```





## 依存パッケージ

この実装では {{classcat}} を使っています。

{{classcat}} を使う場合：

```yarn add classcat```



----



## ✅ 利用例

トップ画面などでの使い方：

```import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="space-y-4">
      <Button href="/session" size="lg" fullWidth>
        セッションを開始
      </Button>

      <Button href="/history" variant="secondary" fullWidth>
        履歴を見る
      </Button>

      <Button href="/themes" variant="ghost" fullWidth>
        テーマ管理
      </Button>
    </div>
  );
}```
