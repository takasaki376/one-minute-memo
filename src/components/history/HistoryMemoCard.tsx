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

function previewContent(memo: MemoRecord): string {
  const text = memo.textContent.trim();
  if (text.length > 0) return text;
  if (memo.handwritingType === "dataUrl" && memo.handwritingDataUrl) {
    return "（手書きのみ）";
  }
  return "（入力なし）";
}

/**
 * 履歴一覧で1件のメモを表示するカード（日時・テーマ・入力内容・詳細への導線）
 */
export function HistoryMemoCard({
  memo,
  themeTitle,
  detailHref,
  className,
}: HistoryMemoCardProps) {
  const at = memo.createdAt ? new Date(memo.createdAt) : null;
  const when = formatSessionDateTime(at);
  const body = previewContent(memo);

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
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 line-clamp-4 whitespace-pre-wrap break-words">
        入力内容: {body}
      </p>
      <div className="mt-3 flex justify-end">
        <Button href={detailHref} variant="secondary" size="sm">
          詳細を見る
        </Button>
      </div>
    </div>
  );
}
