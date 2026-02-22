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
  /** 残り秒数 */
  secondsLeft?: number;
  /** 外側コンテナに追加するクラス */
  className?: string;
}

/**
 * セッション画面の上部に表示するテーマヘッダー。
 *
 * - スマホ（md未満）: テーマ情報＋タイマーを縦積み表示
 * - タブレット／PC（md以上）: 1行にコンパクト配置（テーマ名左、進捗＋タイマー右）
 */
export function ThemeHeader({
  currentIndex,
  total,
  title,
  category,
  secondsLeft,
  className,
}: ThemeHeaderProps) {
  const containerClass = cc([
    'w-full',
    'bg-white',
    'border-b border-slate-200',
    className,
  ]);

  return (
    <div className={containerClass}>
      {/* ===== スマホ（md未満）: 従来の縦積みレイアウト ===== */}
      <div className="block px-4 py-3 md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            {currentIndex} / {total}
          </span>
          {category && (
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
              {category}
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {secondsLeft !== undefined && (
          <div className="mt-3 flex items-center justify-center">
            <div className="rounded-lg bg-slate-100 px-6 py-3">
              <p className="text-center text-sm text-slate-600">残り時間</p>
              <p className="text-center text-3xl font-bold text-slate-900 tabular-nums">
                {secondsLeft}
              </p>
              <p className="text-center text-xs text-slate-500">秒</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== タブレット／PC（md以上）: 1行コンパクトレイアウト ===== */}
      <div className="hidden items-center gap-4 px-4 py-2 md:flex">
        {/* 左: テーマ名（長い場合は省略） */}
        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-base font-semibold text-slate-900"
            title={title}
            aria-hidden="true"
          >
            {title}
          </h2>
        </div>

        {/* 右: カテゴリ + 進捗 + タイマー */}
        <div className="flex shrink-0 items-center gap-3">
          {category && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {category}
            </span>
          )}
          <span className="text-sm font-medium text-slate-600">
            {currentIndex} / {total}
          </span>
          {secondsLeft !== undefined && (
            <div className="flex items-baseline gap-1 rounded-md bg-slate-100 px-3 py-1">
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {secondsLeft}
              </span>
              <span className="text-xs text-slate-500">秒</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
