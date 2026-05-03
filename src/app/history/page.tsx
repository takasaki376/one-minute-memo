"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { HistoryFilterCalendar } from "@/components/history/HistoryFilterCalendar";
import { HistoryMemoCard } from "@/components/history/HistoryMemoCard";
import { getAllMemos } from "@/lib/db/memosRepo";
import { getThemesByIds } from "@/lib/db/themesRepo";
import { isoToLocalDateKey } from "@/lib/utils/dateFormatters";
import type { MemoRecord } from "@/types/memo";
import type { ThemeRecord } from "@/types/theme";

type LoadStage = "idle" | "loading" | "loaded" | "error";

function themeFallbackTitle(order: number): string {
  return `テーマ ${order}`;
}

export default function HistoryPage() {
  const [stage, setStage] = useState<LoadStage>("idle");
  const [memos, setMemos] = useState<MemoRecord[]>([]);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterThemeId, setFilterThemeId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setStage("loading");
        setError(null);

        const allMemos = await getAllMemos();
        const themeIds = Array.from(new Set(allMemos.map((m) => m.themeId)));
        const themeRows = await getThemesByIds(themeIds);

        setMemos(allMemos);
        setThemes(themeRows);
        setStage("loaded");
      } catch (e) {
        console.error("Failed to load history", e);
        setError("履歴の読み込み中にエラーが発生しました。");
        setStage("error");
      }
    };

    void load();
  }, []);

  const themeMap = useMemo(() => {
    const map = new Map<string, ThemeRecord>();
    for (const t of themes) {
      map.set(t.id, t);
    }
    return map;
  }, [themes]);

  const themeOptions = useMemo(() => {
    const ids = Array.from(new Set(memos.map((m) => m.themeId)));
    const rows = ids
      .map((id) => {
        const t = themeMap.get(id);
        return {
          id,
          label: t?.title ?? id,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "ja"));
    return rows;
  }, [memos, themeMap]);

  const filteredMemos = useMemo(() => {
    return memos.filter((m) => {
      if (filterThemeId && m.themeId !== filterThemeId) {
        return false;
      }
      if (filterDate && isoToLocalDateKey(m.createdAt) !== filterDate) {
        return false;
      }
      return true;
    });
  }, [memos, filterDate, filterThemeId]);

  /** カレンダー上の「メモあり」表示用（テーマ絞り込み時はその条件後の日付のみ） */
  const memosForDateHints = useMemo(() => {
    return memos.filter((m) => !filterThemeId || m.themeId === filterThemeId);
  }, [memos, filterThemeId]);

  const memoDateKeys = useMemo(() => {
    const s = new Set<string>();
    for (const m of memosForDateHints) {
      s.add(isoToLocalDateKey(m.createdAt));
    }
    return s;
  }, [memosForDateHints]);

  const calendarInitialMonth = useMemo(() => {
    const first = memos[0]?.createdAt;
    return first ? new Date(first) : new Date(0);
  }, [memos]);

  const filtersActive = Boolean(filterDate || filterThemeId);

  // ローディング中
  if (stage === "idle" || stage === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          履歴を読み込んでいます…
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          これまでのメモの記録を取得しています。
        </p>
      </main>
    );
  }

  // エラー時
  if (stage === "error") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          履歴を読み込めませんでした
        </h1>
        {error && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => {
              window.location.reload();
            }}
          >
            再読み込み
          </Button>
          <Button href="/" variant="secondary">
            トップへ戻る
          </Button>
        </div>
      </main>
    );
  }

  // 空状態（メモ0件）
  if (memos.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            履歴一覧
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            保存されたメモの一覧です。日付とテーマで絞り込めます。
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            まだメモがありません
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            セッションでメモを書き保存すると、ここに表示されます
          </p>
          <div className="mt-6">
            <Button href="/session" variant="primary">
              セッションを開始
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          履歴一覧
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          保存されたメモの一覧です。日付とテーマで絞り込めます。
        </p>
      </div>

      <section
        className="mb-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
        aria-label="絞り込み"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="shrink-0 lg:w-[min(100%,20rem)]">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              日付
            </p>
            <HistoryFilterCalendar
              memoDateKeys={memoDateKeys}
              selectedDate={filterDate}
              onSelectDate={setFilterDate}
              initialMonth={calendarInitialMonth}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
              <span className="font-medium">テーマ</span>
              <select
                value={filterThemeId}
                onChange={(e) => setFilterThemeId(e.target.value)}
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">すべて</option>
                {themeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {filtersActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-stretch sm:self-auto"
                onClick={() => {
                  setFilterDate("");
                  setFilterThemeId("");
                }}
              >
                条件をクリア
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {filteredMemos.length} 件を表示（全 {memos.length} 件）
        </p>
      </section>

      {filteredMemos.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            条件に一致するメモがありません
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            日付またはテーマを変えると表示されます
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredMemos.map((memo) => {
            const theme = themeMap.get(memo.themeId);
            const themeTitle =
              theme?.title ?? themeFallbackTitle(memo.order);
            return (
              <li key={memo.id}>
                <HistoryMemoCard
                  memo={memo}
                  themeTitle={themeTitle}
                  detailHref={`/history/${memo.sessionId}`}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 text-center">
        <Button href="/session" variant="secondary">
          新しいセッションを開始
        </Button>
      </div>
    </main>
  );
}
