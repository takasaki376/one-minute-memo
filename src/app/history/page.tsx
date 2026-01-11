"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SessionCard } from "@/components/history/SessionCard";
import { getAllSessionsSorted } from "@/lib/db/sessionsRepo";
import type { SessionRecord } from "@/types/session";

type LoadStage = "idle" | "loading" | "loaded" | "error";

export default function HistoryPage() {
  const [stage, setStage] = useState<LoadStage>("idle");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setStage("loading");
        setError(null);

        const all = await getAllSessionsSorted();
        setSessions(all);
        setStage("loaded");
      } catch (e) {
        console.error("Failed to load sessions", e);
        setError("履歴の読み込み中にエラーが発生しました。");
        setStage("error");
      }
    };

    void load();
  }, []);

  // セッションをソート（endedAt優先、なければstartedAtで降順）
  const sortedSessions = useMemo(() => {
    const copy = [...sessions];
    copy.sort((a, b) => {
      // endedAtがある場合はそれを優先、なければstartedAtを使用
      const aKey = a.endedAt ?? a.startedAt;
      const bKey = b.endedAt ?? b.startedAt;
      const aTime = aKey ? new Date(aKey).getTime() : 0;
      const bTime = bKey ? new Date(bKey).getTime() : 0;
      return bTime - aTime; // 降順（新しい順）
    });
    return copy;
  }, [sessions]);

  // ローディング中
  if (stage === "idle" || stage === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          履歴を読み込んでいます…
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          これまでのセッションの記録を取得しています。
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
            href="/session"
            variant="primary"
            onClick={() => {
              // ページを再読み込み
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

  // 空状態
  if (sortedSessions.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            履歴一覧
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            これまでのセッションの記録です。
          </p>
        </div>

        {/* 空状態 */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            まだセッション履歴がありません
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            最初のセッションを開始してみましょう
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

  // 通常表示：セッション一覧
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          履歴一覧
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          これまでのセッションの記録です。
        </p>
      </div>

      {/* セッション一覧 */}
      <ul className="flex flex-col gap-3">
        {sortedSessions.map((session) => (
          <li key={session.id}>
            <SessionCard
              session={session}
              href={`/history/${session.id}`}
            />
          </li>
        ))}
      </ul>

      {/* 下部アクション */}
      <div className="mt-8 text-center">
        <Button href="/session" variant="secondary">
          新しいセッションを開始
        </Button>
      </div>
    </main>
  );
}
