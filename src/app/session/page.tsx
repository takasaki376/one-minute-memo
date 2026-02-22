"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { HandwritingCanvas } from "@/components/session/HandwritingCanvas";
import { ThemeHeader } from "@/components/session/ThemeHeader";
import { useCountdown } from "@/lib/timer/useCountdown";
import { createSession, completeSession } from "@/lib/db/sessionsRepo";
import { saveMemo, getMemosBySession } from "@/lib/db/memosRepo";
import { pickRandomActiveThemes } from "@/lib/utils/selectRandomThemes";
import { getSettings } from "@/lib/db/settingsRepo";
import { DEFAULT_SETTINGS } from "@/types/settings";

type SessionStage = "loading" | "running" | "finished" | "error";

interface SessionTheme {
  id: string;
  title: string;
  category?: string;
}

// デフォルト値（設定取得失敗時のフォールバック）
const DEFAULT_THEME_COUNT = DEFAULT_SETTINGS.theme_count;
const DEFAULT_TIME_LIMIT_SECONDS = Number.parseInt(
  DEFAULT_SETTINGS.time_limit,
  10,
);

export default function SessionPage() {
  const router = useRouter();

  // --- セッション全体の状態 ---
  const [stage, setStage] = useState<SessionStage>("loading");
  const [themes, setThemes] = useState<SessionTheme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 0〜N-1
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);
  // セッション開始時の設定値（このセッションで固定）
  // themeCountは現時点では未使用だが、将来的に「セッション結果画面／分析機能」で
  // 1セッションあたりのテーマ数を表示・保存する際に利用する予定のため state として保持しておく
  const [, setThemeCount] = useState(DEFAULT_THEME_COUNT);
  const [secondsPerTheme, setSecondsPerTheme] = useState(
    DEFAULT_TIME_LIMIT_SECONDS,
  );
  // PJ1-99: 重複実行を防ぐためのフラグ（UI更新用、将来的にローディング表示などに使用可能）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  // PJ1-99: レースコンディション対策: useRefで同期的なロックを実装
  const savingRef = useRef(false);

  // --- 現在テーマの入力状態 ---
  const [text, setText] = useState("");
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(
    null,
  );
  // 入力モードのタブ切り替え: 手書き / テキスト
  const [activeInputTab, setActiveInputTab] = useState<"handwriting" | "text">(
    "handwriting",
  );
  // テキスト入力エリアへの参照（タブ切り替え時のフォーカス制御に使用）
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // タイマー（secondsPerThemeは初期化時に設定される）
  const { secondsLeft, isRunning, start, reset, pause } = useCountdown({
    initialSeconds: secondsPerTheme,
    autoStart: false, // テーマ準備が終わってから start する
    onFinish: () => {
      void handleThemeFinishedAuto();
    },
  });

  const currentTheme = useMemo(
    () => themes[currentIndex] ?? null,
    [themes, currentIndex],
  );

  // テキストタブに切り替わった際に自動フォーカス
  useEffect(() => {
    if (
      activeInputTab === "text" &&
      textareaRef.current &&
      stage === "running" &&
      secondsLeft > 0
    ) {
      textareaRef.current.focus();
    }
  }, [activeInputTab, stage, secondsLeft]);

  // セッション開始時の初期化
  useEffect(() => {
    const init = async () => {
      try {
        setStage("loading");

        // 設定を取得（失敗時はデフォルト値を使用）
        let settingsThemeCount = DEFAULT_THEME_COUNT;
        let settingsTimeLimit = DEFAULT_TIME_LIMIT_SECONDS;
        try {
          const settings = await getSettings();
          // theme_countの値検証
          const parsedThemeCount = Number.parseInt(
            String(settings.theme_count),
            10,
          );
          if (!Number.isNaN(parsedThemeCount) && parsedThemeCount > 0) {
            settingsThemeCount = parsedThemeCount;
          }
          // time_limitの値検証
          const parsedTimeLimit = Number.parseInt(settings.time_limit, 10);
          if (!Number.isNaN(parsedTimeLimit) && parsedTimeLimit > 0) {
            settingsTimeLimit = parsedTimeLimit;
          }
        } catch (err) {
          console.error("Failed to load settings, using defaults:", err);
          // デフォルト値を使用（既に設定済み）
        }

        // 設定値をstateとして保持（このセッションで固定）
        setThemeCount(settingsThemeCount);
        setSecondsPerTheme(settingsTimeLimit);

        // テーマ抽選（設定値を使用）
        const selected = await pickRandomActiveThemes(settingsThemeCount);

        if (selected.length === 0) {
          setStage("error");
          return;
        }

        setThemes(selected);

        // セッションは最初のメモ保存時に作成する（メモ0件のセッションを防ぐため）
        // sessionIdはnullのままにしておく

        // 最初のテーマ用に入力状態をリセット
        setCurrentIndex(0);
        reset(settingsTimeLimit);
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
  }, [reset, start]);

  // PJ1-99: 現在テーマのメモをIndexedDBに保存する
  // タスク仕様に合わせて、id/createdAt/updatedAtの指定を削除（saveMemo側で自動生成）
  // themeIdは引数として受け取ることで、非同期処理中にcurrentThemeが変わる可能性に対応
  const saveCurrentMemo = async (
    index: number,
    themeId: string,
  ): Promise<void> => {
    // セッションがまだ作成されていない場合は、最初のメモ保存時に作成する
    // これにより、メモ0件のセッションが作成されることを防ぐ
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      if (themes.length === 0) {
        console.error(
          "[PJ1-99] テーマが設定されていないためセッションを作成できません",
        );
        return;
      }
      const session = await createSession(themes.map((t) => t.id));
      currentSessionId = session.id;
      setSessionId(session.id);
      // デバッグ用: 開発環境でのみセッション情報をコンソールに出力
      if (process.env.NODE_ENV === "development") {
        console.log("[PJ1-99] 最初のメモ保存時にセッションを作成しました:", {
          id: session.id,
          themeIds: session.themeIds,
          startedAt: session.startedAt,
          memoCount: session.memoCount,
        });
      }
    }

    try {
      const savedMemo = await saveMemo({
        sessionId: currentSessionId,
        themeId,
        order: index + 1, // 引数として受け取ったindexを使用
        textContent: text,
        handwritingType: handwritingDataUrl ? "dataUrl" : "none",
        handwritingDataUrl: handwritingDataUrl ?? undefined,
      });

      // デバッグ用: 開発環境でのみ保存されたメモをコンソールに出力
      if (process.env.NODE_ENV === "development") {
        console.log("[PJ1-99] メモを保存しました:", {
          id: savedMemo.id,
          sessionId: savedMemo.sessionId,
          themeId: savedMemo.themeId,
          order: savedMemo.order,
          textLength: savedMemo.textContent.length,
          hasHandwriting: savedMemo.handwritingType !== "none",
          currentIndex: index,
          createdAt: savedMemo.createdAt,
          updatedAt: savedMemo.updatedAt,
          totalThemes: themes.length,
          isLastTheme: index === themes.length - 1,
        });
      }

      setMemoCount((prev) => prev + 1);
    } catch (e) {
      console.error("Failed to save memo", e);
      // エラーが発生してもセッションは続行する
    }
  };

  // PJ1-99: タイマー終了で自動的に次へ進むとき
  const handleThemeFinishedAuto = async () => {
    await handleThemeFinished({ triggeredByUser: false });
  };

  // PJ1-99: 「次へ」ボタン or タイマー終了時の共通処理
  // タスク仕様に合わせて、メモ保存→次テーマ/完了の流れを実装
  // 重複実行を防ぐため、useRefを使った同期的なロックを実装
  const handleThemeFinished = async (options?: {
    triggeredByUser?: boolean;
  }) => {
    // PJ1-99: レースコンディション対策: useRefで同期的にロックをチェック
    if (savingRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[PJ1-99] handleThemeFinishedをスキップ（既に保存中）:", {
          currentIndex,
          sessionId,
        });
      }
      return;
    }

    if (!currentTheme) {
      if (process.env.NODE_ENV === "development") {
        console.log("[PJ1-99] handleThemeFinishedをスキップ（テーマなし）:", {
          currentIndex,
          sessionId,
        });
      }
      return;
    }

    // PJ1-99: 同期的にロックを取得（レースコンディション対策）
    savingRef.current = true;
    setIsSavingMemo(true);

    try {
      // 現在のindexとthemeIdをローカル変数に保持（非同期処理中に変わる可能性があるため）
      const currentIndexToSave = currentIndex;
      const themeIdToSave = currentTheme.id;
      // PJ1-99: 最後のテーマかどうかを現在のindexで判定
      const isLastThemeToSave =
        themes.length > 0 && currentIndexToSave === themes.length - 1;

      // デバッグ用: 開発環境でのみテーマ終了処理の開始をログ出力
      if (process.env.NODE_ENV === "development") {
        console.log("[PJ1-99] handleThemeFinished開始:", {
          currentIndex: currentIndexToSave,
          themeId: themeIdToSave,
          sessionId,
          isLastTheme: isLastThemeToSave,
          totalThemes: themes.length,
          triggeredByUser: options?.triggeredByUser,
        });
      }

      // 現在のメモをIndexedDBに保存（indexとthemeIdを引数として渡す）
      await saveCurrentMemo(currentIndexToSave, themeIdToSave);

      if (isLastThemeToSave) {
        // PJ1-99: 最後のテーマなので、セッションを完了
        // DBから実際のメモ数を取得して使用（保存に失敗した場合にも対応）
        await handleSessionComplete();
        return;
      }

      // 次のテーマへ
      const nextIndex = currentIndexToSave + 1;
      setCurrentIndex(nextIndex);
      setText("");
      setHandwritingDataUrl(null);

      // タイマーをリセットして開始（設定値を使用）
      reset(secondsPerTheme);
      start();
    } finally {
      // PJ1-99: 処理完了時にロックをリセット（エラーが発生しても確実にリセット）
      savingRef.current = false;
      setIsSavingMemo(false);
    }
  };

  // PJ1-99: セッション完了時の処理
  // IndexedDBのsessionsストアを完了状態に更新（endedAt, memoCountを更新）
  // DBから実際のメモ数を取得して使用することで、保存に失敗した場合にも対応
  const handleSessionComplete = async () => {
    if (!sessionId) return;

    try {
      // PJ1-99: DBから実際のメモ数を取得（保存に失敗した場合にも対応）
      const actualMemos = await getMemosBySession(sessionId);
      const actualMemoCount = actualMemos.length;

      await completeSession(sessionId, actualMemoCount);
      // デバッグ用: 開発環境でのみ完了したセッションをコンソールに出力
      if (process.env.NODE_ENV === "development") {
        console.log("[PJ1-99] セッションを完了しました:", {
          sessionId,
          actualMemoCount,
          stateMemoCount: memoCount,
        });
      }
    } catch (e) {
      console.error("Failed to complete session", e);
      // エラーが発生しても完了画面へ遷移する
    }

    setStage("finished");

    // 完了画面へ遷移（sessionIdをクエリパラメータで渡す）
    router.push(`/session/complete?sessionId=${sessionId}`);
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
    <main className="mx-auto flex w-full max-w-[1024px] flex-col gap-4 bg-slate-50 p-8">
      <ThemeHeader
        currentIndex={currentNumber}
        total={total}
        title={currentTheme.title}
        category={currentTheme.category}
        secondsLeft={secondsLeft}
      />

      {/* タブ + フッター操作 */}
      <section className="border-t border-slate-200 pt-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div
            className="inline-flex gap-1 rounded-lg bg-slate-100 p-0.5"
            role="tablist"
            aria-label="入力方式"
          >
            <button
              type="button"
              id="tab-handwriting"
              role="tab"
              aria-controls="panel-handwriting"
              aria-selected={activeInputTab === "handwriting"}
              className={
                activeInputTab === "handwriting"
                  ? "rounded-md bg-white px-3 py-1.5 text-[13px] font-medium text-slate-900"
                  : "rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
              }
              onClick={() => setActiveInputTab("handwriting")}
            >
              手書き入力
            </button>
            <button
              type="button"
              id="tab-text"
              role="tab"
              aria-controls="panel-text"
              aria-selected={activeInputTab === "text"}
              className={
                activeInputTab === "text"
                  ? "rounded-md bg-white px-3 py-1.5 text-[13px] font-medium text-slate-900"
                  : "rounded-md bg-transparent px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
              }
              onClick={() => setActiveInputTab("text")}
            >
              テキスト入力
            </button>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:flex-nowrap">
            <p className="text-xs text-slate-400">
              {isRunning ? "入力中…" : "一時停止中"}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                if (isRunning) {
                  pause();
                } else {
                  start();
                }
              }}
              disabled={secondsLeft === 0}
              className="bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              {isRunning ? "一時停止" : "再開"}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleThemeFinished()}
              disabled={secondsLeft === 0}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              このテーマを終えて次へ
            </Button>
          </div>
        </div>
      </section>

      {/* 入力エリア */}
      <section className="min-h-[520px] rounded-lg bg-white p-4">
        <div
          id="panel-handwriting"
          role="tabpanel"
          aria-labelledby="tab-handwriting"
          hidden={activeInputTab !== "handwriting"}
        >
          <HandwritingCanvas
            value={handwritingDataUrl}
            onChange={setHandwritingDataUrl}
            disabled={isInputDisabled}
            width={960}
            height={480}
            className="w-full"
          />
        </div>
        <div
          id="panel-text"
          role="tabpanel"
          aria-labelledby="tab-text"
          hidden={activeInputTab !== "text"}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isInputDisabled}
            placeholder="思いつくことをできるだけ書き出してみましょう"
            aria-label="テキストメモ入力"
            className="h-[480px] w-full resize-none border-none bg-transparent text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-300 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          />
        </div>
      </section>
    </main>
  );
}
