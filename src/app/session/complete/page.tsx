"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { getSessionById } from "@/lib/db/sessionsRepo";
import { formatSessionDateTime } from "@/lib/utils/dateFormatters";
import type { SessionRecord } from "@/types/session";

type PageStage = "loading" | "success" | "error";

function SessionCompleteContent() {
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<PageStage>("loading");
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const sessionId = searchParams.get("sessionId");

      if (!sessionId) {
        setError("セッションIDが指定されていません");
        setStage("error");
        return;
      }

      try {
        const loadedSession = await getSessionById(sessionId);

        if (!loadedSession) {
          setError("セッションが見つかりませんでした");
          setStage("error");
          return;
        }

        setSession(loadedSession);
        setStage("success");
      } catch (e) {
        console.error("Failed to load session", e);
        setError("セッション情報の取得に失敗しました");
        setStage("error");
      }
    };

    void loadSession();
  }, [searchParams]);

  // ローディング状態
  if (stage === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          セッション情報を読み込んでいます…
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          お待ちください。
        </p>
      </main>
    );
  }

  // エラー状態
  if (stage === "error" || !session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          セッション情報を取得できませんでした
        </h1>
        {error && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/history" variant="primary">
            履歴一覧を見る
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

  // 成功状態：セッション情報を表示
  const memoCount = session.memoCount;
  const themeCount = session.themeIds.length;
  const started = session.startedAt ? new Date(session.startedAt) : null;
  const ended = session.endedAt ? new Date(session.endedAt) : null;

  const startedLabel = formatSessionDateTime(started);
  const endedLabel = ended ? formatSessionDateTime(ended) : "進行中";

  // 同じ日かどうかをチェック
  const isSameDay =
    started && ended && started.toDateString() === ended.toDateString();

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
      {/* タイトル */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          セッションが完了しました
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          おつかれさまでした。今回のセッションで {memoCount}{" "}
          件のメモを書き出しました。
        </p>
      </div>

      {/* セッション情報 */}
      <div className="mb-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-slate-700 dark:text-slate-300">
              書いたメモ件数
            </dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {memoCount} 件
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-slate-700 dark:text-slate-300">
              実施日時
            </dt>
            <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {startedLabel}
              {ended && !isSameDay && ` 〜 ${endedLabel}`}
              {ended && isSameDay && ` 〜 ${ended.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
            </dd>
          </div>

          {durationMinutes !== null && (
            <div>
              <dt className="text-sm font-medium text-slate-700 dark:text-slate-300">
                所要時間
              </dt>
              <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                約 {durationMinutes} 分
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-slate-700 dark:text-slate-300">
              テーマ数
            </dt>
            <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {themeCount} 個
            </dd>
          </div>
        </dl>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button href="/history" variant="primary" fullWidth>
          履歴一覧を見る
        </Button>
        <Button href="/session" variant="secondary" fullWidth>
          もう一度セッションを始める
        </Button>
      </div>
    </main>
  );
}

export default function SessionCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            セッション情報を読み込んでいます…
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            お待ちください。
          </p>
        </main>
      }
    >
      <SessionCompleteContent />
    </Suspense>
  );
}
