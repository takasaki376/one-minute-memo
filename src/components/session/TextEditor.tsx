'use client';

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
