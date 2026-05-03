"use client";

import cc from "classcat";

import { Button } from "@/components/ui/Button";
import { formatSessionDateTime } from "@/lib/utils/dateFormatters";
import type { MemoRecord } from "@/types/memo";
import type { SessionRecord } from "@/types/session";

export interface SessionCardProps {
  session: SessionRecord;
  /** 指定時のみ「詳細を見る」を表示 */
  detailHref?: string;
  className?: string;
  /** セッション内のメモ（履歴一覧用）。指定時は各メモの内容をカード内に表示 */
  memos?: MemoRecord[];
  /** メモごとのテーマ表示名 */
  resolveThemeTitle?: (memo: MemoRecord) => string;
}

function hasHandwritingImage(memo: MemoRecord): boolean {
  return Boolean(
    memo.handwritingDataUrl &&
      (memo.handwritingType === "dataUrl" || memo.handwritingType === "none"),
  );
}

function SessionMemoEntry({
  memo,
  themeTitle,
  orderTotal,
}: {
  memo: MemoRecord;
  themeTitle: string;
  orderTotal: number;
}) {
  const at = memo.createdAt ? new Date(memo.createdAt) : null;
  const when = formatSessionDateTime(at);
  const text = memo.textContent.trim();
  const showHandwriting = hasHandwritingImage(memo);
  const showEmpty = text.length === 0 && !showHandwriting;

  return (
    <div
      className={cc([
        "rounded-md border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-600/80 dark:bg-slate-900/40",
      ])}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:bg-slate-600 dark:text-slate-100">
          {memo.order}/{orderTotal}
        </span>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {when}
        </p>
      </div>
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
    </div>
  );
}

/**
 * セッション履歴用カード（PJ1-107）
 * - detailHref があるときだけ詳細リンクを表示
 * - memos + resolveThemeTitle で一覧にメモ内容を埋め込める
 */
export function SessionCard({
  session,
  detailHref,
  className,
  memos,
  resolveThemeTitle,
}: SessionCardProps) {
  const started = session.startedAt ? new Date(session.startedAt) : null;
  const ended = session.endedAt ? new Date(session.endedAt) : null;

  const startedLabel = formatSessionDateTime(started);
  const endedLabel = ended ? formatSessionDateTime(ended) : "未完了";

  const themeCount = session.themeIds.length;
  const orderTotal = Math.max(themeCount, 1);

  const sortedMemos =
    memos && memos.length > 0
      ? [...memos].sort((a, b) => a.order - b.order)
      : [];

  const titleResolver =
    resolveThemeTitle ??
    ((m: MemoRecord) => `テーマ ${m.order}`);

  return (
    <div
      className={cc([
        "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm",
        className,
      ])}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {startedLabel} 開始
            {session.endedAt && ` / ${endedLabel} 終了`}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            テーマ {themeCount} 件・メモ {session.memoCount} 件
          </p>
        </div>

        {detailHref ? (
          <div className="mt-2 shrink-0 sm:mt-0">
            <Button href={detailHref} variant="secondary" size="sm">
              詳細を見る
            </Button>
          </div>
        ) : null}
      </div>

      {sortedMemos.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
          {sortedMemos.map((memo) => (
            <li key={memo.id}>
              <SessionMemoEntry
                memo={memo}
                themeTitle={titleResolver(memo)}
                orderTotal={orderTotal}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
