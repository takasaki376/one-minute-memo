"use client";

import cc from "classcat";

import { Button } from "@/components/ui/Button";
import { formatSessionDateTime } from "@/lib/utils/dateFormatters";
import type { MemoRecord } from "@/types/memo";

export interface HistoryMemoCardProps {
  memo: MemoRecord;
  themeTitle: string;
  detailHref: string;
  className?: string;
}

function hasHandwritingImage(memo: MemoRecord): boolean {
  return Boolean(
    memo.handwritingDataUrl &&
      (memo.handwritingType === "dataUrl" || memo.handwritingType === "none"),
  );
}

/**
 * 履歴一覧で1件のメモを表示するカード（日時・テーマ・入力内容・手書き画像・詳細への導線）
 */
export function HistoryMemoCard({
  memo,
  themeTitle,
  detailHref,
  className,
}: HistoryMemoCardProps) {
  const at = memo.createdAt ? new Date(memo.createdAt) : null;
  const when = formatSessionDateTime(at);
  const text = memo.textContent.trim();
  const showHandwriting = hasHandwritingImage(memo);
  const showEmpty = text.length === 0 && !showHandwriting;

  return (
    <div
      className={cc([
        "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm",
        className,
      ])}
    >
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {when}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        テーマ: {themeTitle}
      </p>
      {text.length > 0 ? (
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 line-clamp-4 whitespace-pre-wrap break-words">
          入力内容: {text}
        </p>
      ) : null}
      {showHandwriting ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            手書き
          </p>
          <img
            src={memo.handwritingDataUrl}
            alt=""
            className="mt-1 max-h-56 w-auto max-w-full rounded-md border border-slate-200 bg-white object-contain dark:border-slate-600"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      {showEmpty ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          入力内容: （入力なし）
        </p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button href={detailHref} variant="secondary" size="sm">
          詳細を見る
        </Button>
      </div>
    </div>
  );
}
