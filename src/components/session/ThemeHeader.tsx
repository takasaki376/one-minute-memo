'use client';

import React from 'react';
import cc from 'classcat';

export interface ThemeHeaderProps {
  /** 現在のテーマインデックス（1始まり） */
  currentIndex: number;
  /** 総テーマ数 */
  total: number;
  /** テーマタイトル */
  title: string;
  /** テーマカテゴリ（任意） */
  category?: string;
  /** 外側コンテナに追加するクラス */
  className?: string;
}

/**
 * セッション画面の上部に表示するテーマヘッダー。
 * 現在のテーマ情報とインデックス（例：1 / 10）を表示する。
 */
export function ThemeHeader({
  currentIndex,
  total,
  title,
  category,
  className,
}: ThemeHeaderProps) {
  const containerClass = cc([
    'w-full',
    'px-4 py-3',
    'bg-white',
    'border-b border-slate-200',
    className,
  ]);

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">
          {currentIndex} / {total}
        </span>
        {category && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {category}
          </span>
        )}
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
  );
}
