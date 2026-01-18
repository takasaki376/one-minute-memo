"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSessionById } from "@/lib/db/sessionsRepo";
import { getMemosBySession } from "@/lib/db/memosRepo";
import { getThemesByIds } from "@/lib/db/themesRepo";
import type { SessionRecord } from "@/types/session";
import type { MemoRecord } from "@/types/memo";
import type { ThemeRecord } from "@/types/theme";

type LoadStage = "idle" | "loading" | "loaded" | "error";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** 表示用にまとめた1件分のメモ */
interface DisplayMemo {
  id: string;
  order: number;
  themeId: string;
  themeTitle: string;
  themeCategory?: string;
  textContent: string;
  handwritingDataUrl?: string;
}

export default function HistoryDetailPage({ params }: PageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [memos, setMemos] = useState<MemoRecord[]>([]);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [stage, setStage] = useState<LoadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  // params を解決
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { id } = await params;
        if (!isMounted) return;
        setSessionId(id);
      } catch (err) {
        console.error("Failed to resolve params:", err);
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "パラメータの解決に失敗しました"
        );
        setStage("error");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [params]);

  // データ取得
  useEffect(() => {
    if (!sessionId) return;

    const loadData = async () => {
      setStage("loading");
      setError(null);

      try {
        // セッション取得
        const sessionData = await getSessionById(sessionId);
        if (!sessionData) {
          setError("対象のセッションが見つかりませんでした");
          setStage("error");
          return;
        }
        setSession(sessionData);

        // メモ取得
        const memosData = await getMemosBySession(sessionId);
        setMemos(memosData);

        // テーマ取得
        const themesData = await getThemesByIds(sessionData.themeIds);
        setThemes(themesData);

        setStage("loaded");
      } catch (err) {
        console.error("Failed to load session data:", err);
        setError(
          err instanceof Error ? err.message : "データの読み込みに失敗しました"
        );
        setStage("error");
      }
    };

    loadData();
  }, [sessionId]);

  // テーママップを作成
  const themeMap = useMemo(() => {
    const map = new Map<string, ThemeRecord>();
    for (const theme of themes) {
      map.set(theme.id, theme);
    }
    return map;
  }, [themes]);

  // 表示用メモデータを作成
  const displayMemos: DisplayMemo[] = useMemo(() => {
    if (!session) return [];

    return memos
      .map((memo) => {
        const theme = themeMap.get(memo.themeId);
        return {
          id: memo.id,
          order: memo.order,
          themeId: memo.themeId,
          themeTitle: theme?.title ?? `テーマ ${memo.order}`,
          themeCategory: theme?.category,
          textContent: memo.textContent,
          handwritingDataUrl: memo.handwritingDataUrl,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [memos, session, themeMap]);

  // ローディング中
  if (stage === "idle" || stage === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          セッション履歴を読み込んでいます…
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          少しお待ちください。
        </p>
      </main>
    );
  }

  // エラー or セッションなし
  if (stage === "error" || !session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          セッション履歴を表示できません
        </h1>
        {error && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/history" variant="primary">
            履歴一覧に戻る
          </Button>
          <Button href="/session" variant="secondary">
            新しくセッションを始める
          </Button>
          <Button href="/" variant="ghost">
            トップへ戻る
          </Button>
        </div>
      </main>
    );
  }

  // 正常時: セッション概要
  const started = session.startedAt ? new Date(session.startedAt) : null;
  const ended = session.endedAt ? new Date(session.endedAt) : null;

  const startedLabel = started
    ? started.toLocaleString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "不明";

  const endedLabel = ended
    ? ended.toLocaleString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "進行中";

  // 所要時間（分）の計算（endedAt がある場合のみ）
  let durationMinutes: number | null = null;
  if (started && ended) {
    const diffMs = ended.getTime() - started.getTime();
    if (diffMs > 0) {
      durationMinutes = Math.round(diffMs / 1000 / 60);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        セッション詳細
      </h1>

      {/* セッション概要カード */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          セッション概要
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400 font-medium">
              開始日時
            </dt>
            <dd className="mt-1 text-slate-900 dark:text-slate-100">
              {startedLabel}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400 font-medium">
              終了日時
            </dt>
            <dd className="mt-1 text-slate-900 dark:text-slate-100">
              {endedLabel}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400 font-medium">
              メモ件数
            </dt>
            <dd className="mt-1 text-slate-900 dark:text-slate-100">
              {session.memoCount} 件
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400 font-medium">
              使用テーマ数
            </dt>
            <dd className="mt-1 text-slate-900 dark:text-slate-100">
              {session.themeIds.length} 個
            </dd>
          </div>
          {durationMinutes !== null && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">
                所要時間
              </dt>
              <dd className="mt-1 text-slate-900 dark:text-slate-100">
                {durationMinutes} 分
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* メモ一覧 */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          メモ一覧
        </h2>

        {displayMemos.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              このセッションにはメモが保存されていません。
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {displayMemos.map((memo) => (
              <li
                key={memo.id}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
              >
                <header className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      #{memo.order}
                    </span>
                    {memo.themeCategory && (
                      <span className="rounded bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                        {memo.themeCategory}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {memo.themeTitle}
                  </h3>
                </header>

                <div className="mt-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {memo.textContent || (
                    <span className="text-slate-400 dark:text-slate-500">
                      テキストメモはありません。
                    </span>
                  )}
                </div>

                {memo.handwritingDataUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      手書きメモ
                    </p>
                    <div className="rounded border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={memo.handwritingDataUrl}
                        alt={`テーマ ${memo.order} の手書きメモ`}
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ナビゲーションボタン */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/history" variant="primary">
          履歴一覧に戻る
        </Button>
        <Button href="/session" variant="secondary">
          もう一度セッションを始める
        </Button>
        <Button href="/" variant="ghost">
          トップへ戻る
        </Button>
      </div>
    </main>
  );
}
