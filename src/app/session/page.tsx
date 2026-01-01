"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { TextEditor } from "@/components/session/TextEditor";
import { HandwritingCanvas } from "@/components/session/HandwritingCanvas";
import { ThemeHeader } from "@/components/session/ThemeHeader";
import { useCountdown } from "@/lib/timer/useCountdown";
import { createSession, completeSession } from "@/lib/db/sessionsRepo";
import { saveMemo } from "@/lib/db/memosRepo";
import { pickRandomActiveThemes } from "@/lib/utils/selectRandomThemes";
import type { ThemeRecord } from "@/types/theme";

type SessionStage = "loading" | "running" | "finished" | "error";

const TOTAL_THEMES_PER_SESSION = 10;
const SECONDS_PER_THEME = 60;

export default function SessionPage() {
  const router = useRouter();

  // --- セッション全体の状態 ---
  const [stage, setStage] = useState<SessionStage>("loading");
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 0〜N-1
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);

  // --- 現在テーマの入力状態 ---
  const [text, setText] = useState("");
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(
    null
  );

  // タイマー
  const { secondsLeft, isRunning, start, reset, pause } = useCountdown({
    initialSeconds: SECONDS_PER_THEME,
    autoStart: false, // テーマ準備が終わってから start する
    onFinish: () => {
      void handleThemeFinishedAuto();
    },
  });

  const currentTheme = useMemo(
    () => themes[currentIndex] ?? null,
    [themes, currentIndex]
  );

  // セッション開始時の初期化
  useEffect(() => {
    const init = async () => {
      try {
        setStage("loading");

        const selected = await pickRandomActiveThemes(TOTAL_THEMES_PER_SESSION);

        if (selected.length === 0) {
          setStage("error");
          return;
        }

        setThemes(selected);

        // DBにセッションを作成
        const session = await createSession(selected.map((t) => t.id));
        setSessionId(session.id);

        // 最初のテーマ用に入力状態をリセット
        setCurrentIndex(0);
        reset(SECONDS_PER_THEME);
        setText("");
        setHandwritingDataUrl(null);

        // タイマー開始
        start();
        setStage("running");
      } catch (e) {
        console.error("Failed to init session", e);
        setStage("error");
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLastTheme = themes.length > 0 && currentIndex === themes.length - 1;

  // 現在テーマのメモを保存する
  const saveCurrentMemo = async (): Promise<number | null> => {
    if (!currentTheme || !sessionId) return null;

    try {
      await saveMemo({
        id: `memo-${sessionId}-${currentIndex}-${Date.now()}`,
        sessionId,
        themeId: currentTheme.id,
        order: currentIndex + 1,
        textContent: text,
        handwritingType: handwritingDataUrl ? "dataUrl" : "none",
        handwritingDataUrl: handwritingDataUrl ?? undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nextCount = memoCount + 1;
      setMemoCount(nextCount);

      return nextCount;
    } catch (e) {
      console.error("Failed to save memo", e);
      // エラーが発生してもセッションは続行する
    }

    return null;
  };

  // タイマー終了で自動的に次へ進むとき
  const handleThemeFinishedAuto = async () => {
    await handleThemeFinished({ triggeredByUser: false });
  };

  // 「次へ」ボタン or タイマー終了時の共通処理
  const handleThemeFinished = async (options?: {
    triggeredByUser?: boolean;
  }) => {
    if (!currentTheme) return;

    // 現在のメモを保存
    const savedCount = await saveCurrentMemo();

    if (isLastTheme) {
      const finalCount = savedCount ?? memoCount;
      await handleSessionComplete(finalCount);
      return;
    }

    // 次のテーマへ
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setText("");
    setHandwritingDataUrl(null);

    // タイマーをリセットして開始
    reset(SECONDS_PER_THEME);
    start();
  };

  // セッション完了時の処理
  const handleSessionComplete = async (finalMemoCount: number) => {
    if (!sessionId) return;

    try {
      // 最後のメモも保存済みなので memoCount をそのまま使う
      await completeSession(sessionId, finalMemoCount);
    } catch (e) {
      console.error("Failed to complete session", e);
      // エラーが発生しても完了画面へ遷移する
    }

    setStage("finished");

    // 完了画面へ遷移
    router.push("/session/complete");
  };

  // デバッグ & ガード
  if (stage === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">セッションを準備中...</h1>
        <p className="mt-2 text-sm text-slate-600">
          テーマを読み込んでいます。
        </p>
      </main>
    );
  }

  if (stage === "error" || !currentTheme) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">セッションを開始できません</h1>
        <p className="mt-2 text-sm text-slate-600">
          有効なテーマが存在しないか、読み込み時にエラーが発生しました。
        </p>
        <div className="mt-6">
          <Button href="/" variant="secondary">
            トップへ戻る
          </Button>
        </div>
      </main>
    );
  }

  const currentNumber = currentIndex + 1;
  const total = themes.length;
  const isInputDisabled = stage !== "running" || secondsLeft === 0;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      {/* ヘッダー（テーマ情報） */}
      <ThemeHeader
        currentIndex={currentNumber}
        total={total}
        title={currentTheme.title}
        category={currentTheme.category}
      />

      {/* タイマー表示 */}
      <div className="flex items-center justify-center">
        <div className="rounded-lg bg-slate-100 px-6 py-3">
          <p className="text-center text-sm text-slate-600">残り時間</p>
          <p className="text-center text-3xl font-bold text-slate-900 tabular-nums">
            {secondsLeft}
          </p>
          <p className="text-center text-xs text-slate-500">秒</p>
        </div>
      </div>

      {/* 入力エリア */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-700">
            テキストメモ
          </h2>
          <TextEditor
            value={text}
            onChange={setText}
            autoFocus
            disabled={isInputDisabled}
            placeholder="思いつくことをできるだけ書き出してみましょう"
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-700">
            手書きメモ（任意）
          </h2>
          <HandwritingCanvas
            value={handwritingDataUrl}
            onChange={setHandwritingDataUrl}
            disabled={isInputDisabled}
          />
        </div>
      </section>

      {/* フッター操作 */}
      <footer className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="text-xs text-slate-500">
          {isRunning ? "入力中…" : "一時停止中"}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              if (isRunning) {
                pause();
              } else {
                start();
              }
            }}
            disabled={secondsLeft === 0}
          >
            {isRunning ? "一時停止" : "再開"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleThemeFinished({ triggeredByUser: true })}
            disabled={secondsLeft === 0}
          >
            このテーマを終えて次へ
          </Button>
        </div>
      </footer>
    </main>
  );
}
