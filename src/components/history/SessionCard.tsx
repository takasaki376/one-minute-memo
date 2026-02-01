"use client";

import cc from "classcat";

import { Button } from "@/components/ui/Button";
import { formatSessionDateTime } from "@/lib/utils/dateFormatters";
import type { SessionRecord } from "@/types/session";

export interface SessionCardProps {
  session: SessionRecord;
  href?: string; // クリック時に飛ぶ先（例: `/history/${session.id}`）
  className?: string;
}

/**
 * セッション履歴一覧で使うカードコンポーネント（PJ1-107）
 * - session を渡し、href で詳細画面へ遷移
 * - classcat / Tailwind、未完了時は「未完了」表示
 */
export function SessionCard({ session, href, className }: SessionCardProps) {
  const started = session.startedAt ? new Date(session.startedAt) : null;
  const ended = session.endedAt ? new Date(session.endedAt) : null;

  const startedLabel = formatSessionDateTime(started);
  const endedLabel = ended ? formatSessionDateTime(ended) : "未完了";

  const themeCount = session.themeIds.length;

  return (
    <div
      className={cc([
        "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm",
        className,
      ])}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* セッション概要 */}
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {startedLabel} 開始
            {session.endedAt && ` / ${endedLabel} 終了`}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            テーマ {themeCount} 件・メモ {session.memoCount} 件
          </p>
        </div>

        {/* アクション */}
        <div className="mt-2 flex gap-2 sm:mt-0">
          {href ? (
            <Button href={href} variant="secondary" size="sm">
              詳細を見る
            </Button>
          ) : (
            <span title="詳細画面への遷移先が設定されていません">
              <Button disabled variant="secondary" size="sm">
                詳細
              </Button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
