"use client";

import { useEffect, useMemo, useState } from "react";

import cc from "classcat";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export interface HistoryFilterCalendarProps {
  /** メモが存在するローカル日付キー（YYYY-MM-DD） */
  memoDateKeys: Set<string>;
  selectedDate: string;
  /** 空文字を渡すと日付フィルタ解除 */
  onSelectDate: (localDayKey: string) => void;
  /** 初回表示する月（ローカル暦） */
  initialMonth: Date;
  className?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymdKey(y: number, monthIndex: number, d: number) {
  return `${y}-${pad2(monthIndex + 1)}-${pad2(d)}`;
}

/**
 * メモがある日に印を付けた月カレンダーで日付フィルタを選ぶ
 */
export function HistoryFilterCalendar({
  memoDateKeys,
  selectedDate,
  onSelectDate,
  initialMonth,
  className,
}: HistoryFilterCalendarProps) {
  const [view, setView] = useState(() => ({
    y: initialMonth.getFullYear(),
    m: initialMonth.getMonth(),
  }));

  useEffect(() => {
    if (!selectedDate) return;
    const parts = selectedDate.split("-").map(Number);
    const [ys, ms] = parts;
    if (parts.length !== 3 || !ys || !ms) return;
    setView({ y: ys, m: ms - 1 });
  }, [selectedDate]);

  const cells = useMemo(() => {
    const { y, m } = view;
    const first = new Date(y, m, 1);
    const pad = first.getDay();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const out: { key: string; day: number }[] = [];
    for (let i = 0; i < pad; i++) {
      out.push({ key: `pad-${y}-${m}-${i}`, day: -1 });
    }
    for (let d = 1; d <= lastDay; d++) {
      out.push({ key: ymdKey(y, m, d), day: d });
    }
    return out;
  }, [view]);

  const title = `${view.y}年${view.m + 1}月`;

  const goPrev = () => {
    setView((v) => {
      const nm = v.m - 1;
      if (nm < 0) return { y: v.y - 1, m: 11 };
      return { y: v.y, m: nm };
    });
  };

  const goNext = () => {
    setView((v) => {
      const nm = v.m + 1;
      if (nm > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m: nm };
    });
  };

  return (
    <fieldset
      className={cc(["m-0 flex min-w-0 flex-col gap-2 border-0 p-0", className])}
    >
      <legend className="sr-only">日付で絞り込み</legend>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          aria-label="前の月へ"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          aria-label="次の月へ"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 font-medium text-slate-500 dark:text-slate-400"
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.day < 0) {
            return (
              <div
                key={cell.key}
                className="aspect-square min-h-[2.25rem]"
                aria-hidden
              />
            );
          }
          const hasMemo = memoDateKeys.has(cell.key);
          const selected = cell.key === selectedDate;
          return (
            <button
              key={cell.key}
              type="button"
              data-testid={`history-cal-${cell.key}`}
              onClick={() => {
                if (cell.key === selectedDate) {
                  onSelectDate("");
                } else {
                  onSelectDate(cell.key);
                }
              }}
              aria-pressed={selected}
              aria-label={`${view.y}年${view.m + 1}月${cell.day}日${
                hasMemo ? " メモあり" : ""
              }`}
              className={cc([
                "flex min-h-[2.25rem] flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors",
                selected
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700",
                hasMemo &&
                  !selected &&
                  "ring-1 ring-sky-400/70 dark:ring-sky-500/60",
              ])}
            >
              <span>{cell.day}</span>
              <span
                className={cc([
                  "h-1 w-1 shrink-0 rounded-full",
                  hasMemo
                    ? selected
                      ? "bg-white"
                      : "bg-sky-500 dark:bg-sky-400"
                    : "bg-transparent",
                ])}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        印のある日はメモがあります。テーマで絞り込んでいるときは、その条件に合うメモがある日だけ印が付きます。同じ日をもう一度押すと日付指定を解除します。
      </p>
    </fieldset>
  );
}
