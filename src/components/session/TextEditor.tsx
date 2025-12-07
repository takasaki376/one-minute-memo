'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import cc from 'classcat';

export interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const containerClass = cc(['w-full', className]);

  const textareaClass = cc([
    'w-full',
    'min-h-40',
    'rounded-md',
    'border',
    'border-slate-300',
    'bg-white dark:bg-slate-800',
    'px-3',
    'py-2',
    'text-sm',
    'leading-relaxed',
    'text-slate-900 dark:text-slate-100',
    'shadow-sm',
    'placeholder:text-slate-400',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-blue-500',
    'focus-visible:ring-offset-1',
    'resize-y',
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
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={ariaLabel}
        className={textareaClass}
      />
    </div>
  );
}
