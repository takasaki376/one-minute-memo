"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { HandwritingCanvas } from "@/components/session/HandwritingCanvas";
import {
  NextThemeIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/session/SessionActionIcons";
import { TextEditor } from "@/components/session/TextEditor";
import { ThemeHeader } from "@/components/session/ThemeHeader";
import { type SessionTheme, useSessionFlow } from "@/hooks/useSessionFlow";
import { useCountdown } from "@/lib/timer/useCountdown";
import { pickRandomActiveThemes } from "@/lib/utils/selectRandomThemes";
import { getSettings } from "@/lib/db/settingsRepo";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { useThemeSeedState } from "@/components/providers/ThemeSeedProvider";

const TABLET_MIN_WIDTH = 768;

type SessionStage = "loading" | "running" | "finished" | "error";

// デフォルト値（設定取得失敗時のフォールバック）
const DEFAULT_THEME_COUNT = DEFAULT_SETTINGS.theme_count;
const DEFAULT_TIME_LIMIT_SECONDS = Number.parseInt(
  DEFAULT_SETTINGS.time_limit,
  10,
);

export default function SessionPage() {
  const router = useRouter();
  const { isReady: isThemeSeedReady, error: themeSeedError } =
    useThemeSeedState();

  // --- セッション全体の状態 ---
  const [stage, setStage] = useState<SessionStage>("loading");
  const [themes, setThemes] = useState<SessionTheme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 0〜N-1
  const [themeShortage, setThemeShortage] = useState<{
    requested: number;
    actual: number;
  } | null>(null);
  // セッション開始時の設定値（このセッションで固定）
  // themeCountは現時点では未使用だが、将来的に「セッション結果画面／分析機能」で
  // 1セッションあたりのテーマ数を表示・保存する際に利用する予定のため state として保持しておく
  const [, setThemeCount] = useState(DEFAULT_THEME_COUNT);
  const [secondsPerTheme, setSecondsPerTheme] = useState(
    DEFAULT_TIME_LIMIT_SECONDS,
  );

  // --- 現在テーマの入力状態 ---
  const [text, setText] = useState("");
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(
    null,
  );
  // 入力モード: スマホはテキスト開始（SSR/初回も手書きを出さない）。タブレット以上は初回のみ手書きへ。
  const [activeInputTab, setActiveInputTab] = useState<"handwriting" | "text">(
    "text",
  );
  const userSelectedInputTabRef = useRef(false);
  const initialInputTabResolvedRef = useRef(false);
  const [viewMode, setViewMode] = useState<"split" | "handwritingFocus">(
    "split",
  );
  const [isFocusTextOpen, setIsFocusTextOpen] = useState(false);
  const [isTabletUp, setIsTabletUp] = useState(false);
  const portalReady = useIsClient();

  const currentTheme = useMemo(
    () => themes[currentIndex] ?? null,
    [themes, currentIndex],
  );

  const themeFinishedAutoRef = useRef<() => Promise<void>>(async () => {});

  const { secondsLeft, isRunning, start, reset, pause } = useCountdown({
    initialSeconds: secondsPerTheme,
    autoStart: false, // テーマ準備が終わってから start する
    onFinish: () => {
      void themeFinishedAutoRef.current();
    },
  });

  const onAdvanceToNextTheme = useCallback((nextIndex: number) => {
    setCurrentIndex(nextIndex);
    setText("");
    setHandwritingDataUrl(null);
  }, []);

  const onSessionCompleted = useCallback(
    (completedSessionId: string) => {
      setStage("finished");
      router.push(`/session/complete?sessionId=${completedSessionId}`);
    },
    [router],
  );

  const { handleThemeFinished, handleThemeFinishedAuto } = useSessionFlow({
    themes,
    currentIndex,
    currentTheme,
    text,
    handwritingDataUrl,
    secondsPerTheme,
    resetTimer: reset,
    startTimer: start,
    onAdvanceToNextTheme,
    onSessionCompleted,
  });

  useEffect(() => {
    themeFinishedAutoRef.current = handleThemeFinishedAuto;
  }, [handleThemeFinishedAuto]);

  const handleSwitchToHandwritingTab = () => {
    userSelectedInputTabRef.current = true;
    setActiveInputTab("handwriting");
    if (typeof document === "undefined") return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLTextAreaElement) {
      activeElement.blur();
    }
  };

  const handleSwitchToTextTab = () => {
    userSelectedInputTabRef.current = true;
    setActiveInputTab("text");
  };

  const exitHandwritingFocus = useCallback(() => {
    setViewMode("split");
    setIsFocusTextOpen(false);
  }, []);

  const effectiveViewMode = isTabletUp ? viewMode : "split";
  const isHandwritingFocusActive = effectiveViewMode === "handwritingFocus";

  useEffect(() => {
    if (typeof window === "undefined") return;

    let wasTabletUp = window.innerWidth >= TABLET_MIN_WIDTH;

    const updateViewportFlag = () => {
      const tablet = window.innerWidth >= TABLET_MIN_WIDTH;
      if (wasTabletUp && !tablet) {
        exitHandwritingFocus();
      }
      wasTabletUp = tablet;
      setIsTabletUp(tablet);

      // 初回のみ: タブレット以上は手書き、スマホはテキストのまま。以降はユーザー選択を維持。
      if (!initialInputTabResolvedRef.current) {
        initialInputTabResolvedRef.current = true;
        if (tablet && !userSelectedInputTabRef.current) {
          setActiveInputTab("handwriting");
        }
      }
    };

    updateViewportFlag();
    window.addEventListener("resize", updateViewportFlag);
    return () => {
      window.removeEventListener("resize", updateViewportFlag);
    };
  }, [exitHandwritingFocus]);

  useEffect(() => {
    if (!isFocusTextOpen || !isHandwritingFocusActive) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsFocusTextOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isFocusTextOpen, isHandwritingFocusActive]);

  // セッション開始時の初期化
  useEffect(() => {
    if (!isThemeSeedReady) {
      return;
    }

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

        if (selected.length < settingsThemeCount) {
          setThemeShortage({
            requested: settingsThemeCount,
            actual: selected.length,
          });
        } else {
          setThemeShortage(null);
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
  }, [isThemeSeedReady, reset, start]);

  // デバッグ & ガード
  if (themeSeedError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">セッションを開始できません</h1>
        <p className="mt-2 text-sm text-slate-600">
          テーマの読み込み中にエラーが発生しました。
        </p>
        <div className="mt-6">
          <Button href="/" variant="secondary">
            トップへ戻る
          </Button>
        </div>
      </main>
    );
  }

  if (stage === "loading" || !isThemeSeedReady) {
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
  // タブレット + 集中モード時は split 欄ごとアンマウント（hidden のまま TextEditor 等が
  // 残ると ResizeObserver が無駄に走り、ポータル側と二重インスタンスになるのを避ける）
  const mountSplitInputSection = effectiveViewMode === "split";

  const hideChromeForHandwritingFocus = isHandwritingFocusActive;

  return (
    <main className="mx-auto flex w-full max-w-[1024px] flex-col gap-3 bg-slate-50 p-2 md:gap-4 md:p-8">
      {themeShortage && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="theme-shortage-warning"
          aria-live="polite"
          aria-atomic="true"
        >
          {`有効なテーマが不足しているため、${themeShortage.actual}件で開始します（設定:${themeShortage.requested}件）。`}
        </div>
      )}
      {!hideChromeForHandwritingFocus && (
        <div
          className="sticky top-0 z-20 -mx-2 bg-slate-50 px-2 pb-2 pt-0 md:static md:z-auto md:mx-0 md:bg-transparent md:px-0 md:pb-0"
          data-testid="session-sticky-chrome"
        >
          <ThemeHeader
            currentIndex={currentNumber}
            total={total}
            title={currentTheme.title}
            category={currentTheme.category}
            secondsLeft={secondsLeft}
          />

          {/* 入力モード/表示モードの操作 */}
          <section
            className="border-t border-slate-200 bg-slate-50 pt-2 md:bg-transparent md:pt-3"
            data-testid="session-controls"
          >
            <div className="flex flex-row items-center justify-between gap-1 md:gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 md:gap-2">
                {effectiveViewMode === "split" && (
                  <div
                    className="inline-flex max-w-full gap-0.5 rounded-lg bg-slate-100 p-0.5"
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
                          ? "min-h-11 whitespace-nowrap rounded-md bg-white px-2 py-1.5 text-[12px] font-medium text-slate-900 sm:px-3 sm:text-[13px] md:min-h-0"
                          : "min-h-11 whitespace-nowrap rounded-md bg-transparent px-2 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 sm:px-3 sm:text-[13px] md:min-h-0"
                      }
                      onClick={handleSwitchToHandwritingTab}
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
                          ? "min-h-11 whitespace-nowrap rounded-md bg-white px-2 py-1.5 text-[12px] font-medium text-slate-900 sm:px-3 sm:text-[13px] md:min-h-0"
                          : "min-h-11 whitespace-nowrap rounded-md bg-transparent px-2 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 sm:px-3 sm:text-[13px] md:min-h-0"
                      }
                      onClick={handleSwitchToTextTab}
                    >
                      テキスト入力
                    </button>
                  </div>
                )}

                {isTabletUp && effectiveViewMode === "split" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hidden md:inline-flex"
                    onClick={() => {
                      setViewMode("handwritingFocus");
                      setIsFocusTextOpen(false);
                    }}
                    aria-label="手書き集中モードに切り替え"
                    data-testid="focus-mode-button"
                  >
                    手書き集中
                  </Button>
                )}
              </div>

              {effectiveViewMode === "split" && (
                <div className="flex shrink-0 items-center gap-1 md:gap-2">
                  <p
                    className="mr-1 hidden text-xs text-slate-400 md:block"
                    aria-live="polite"
                  >
                    {isRunning ? "入力中…" : "一時停止中"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRunning) {
                        pause();
                      } else {
                        start();
                      }
                    }}
                    disabled={secondsLeft === 0}
                    aria-label={isRunning ? "一時停止" : "再開"}
                    data-testid="session-pause-resume"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-50 md:h-9 md:w-auto md:gap-1.5 md:px-3 md:text-sm md:font-medium"
                  >
                    {isRunning ? (
                      <PauseIcon className="h-5 w-5 md:hidden" />
                    ) : (
                      <PlayIcon className="h-5 w-5 md:hidden" />
                    )}
                    <span className="hidden md:inline">
                      {isRunning ? "一時停止" : "再開"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleThemeFinished()}
                    disabled={secondsLeft === 0}
                    aria-label="このテーマを終えて次へ"
                    data-testid="session-next-theme"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-50 md:h-9 md:w-auto md:gap-1.5 md:px-3 md:text-sm md:font-medium"
                  >
                    <NextThemeIcon className="h-5 w-5 md:hidden" />
                    <span className="hidden md:inline">
                      このテーマを終えて次へ
                    </span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 入力エリア */}
      {mountSplitInputSection && (
        <section
          className="flex min-h-[240px] flex-col rounded-lg bg-white p-2 md:min-h-[520px] md:p-4"
          data-testid="split-layout"
        >
          <div
            id="panel-handwriting"
            role="tabpanel"
            aria-labelledby="tab-handwriting"
            hidden={activeInputTab !== "handwriting"}
            className="min-h-[240px] h-[min(50dvh,480px)] md:h-[480px]"
            data-testid="split-handwriting-panel"
          >
            <HandwritingCanvas
              value={handwritingDataUrl}
              onChange={setHandwritingDataUrl}
              disabled={isInputDisabled}
              className="h-full"
            />
          </div>
          <div
            id="panel-text"
            role="tabpanel"
            aria-labelledby="tab-text"
            hidden={activeInputTab !== "text"}
            data-testid="split-text-panel"
          >
            <TextEditor
              value={text}
              onChange={setText}
              disabled={isInputDisabled}
              autoFocus={
                activeInputTab === "text" &&
                stage === "running" &&
                secondsLeft > 0
              }
              maxLength={1000}
              className="min-h-[240px] h-[min(50dvh,480px)] md:h-[480px]"
            />
          </div>
        </section>
      )}

      {portalReady &&
        isHandwritingFocusActive &&
        createPortal(
          <div className="fixed inset-0 z-50 box-border h-[100dvh] w-[100vw] max-w-none">
            <dialog
              open
              aria-label="手書き集中モード"
              data-testid="focus-handwriting-modal"
              className="absolute inset-0 z-10 m-0 box-border flex min-h-0 h-full w-full max-h-none max-w-none flex-col border-0 bg-slate-50 p-0 shadow-none outline-none open:flex"
            >
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => exitHandwritingFocus()}
                  aria-label="手書き集中を終了して戻る"
                  data-testid="split-mode-button"
                >
                  戻る
                </Button>
                <span
                  className="min-w-0 max-w-[min(40vw,14rem)] truncate text-sm font-medium text-slate-800"
                  title={currentTheme.title}
                >
                  {currentTheme.title}
                </span>
                <span className="text-xs text-slate-500">
                  {currentNumber} / {total}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {secondsLeft}
                  <span className="text-xs font-normal text-slate-500">秒</span>
                </span>
                <span className="flex-1" />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsFocusTextOpen(true)}
                  className="bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="テキスト入力を開く"
                  data-testid="focus-open-text-button"
                >
                  テキスト入力を開く
                </Button>
                <Button
                  size="sm"
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
                  size="sm"
                  variant="primary"
                  onClick={() => void handleThemeFinished()}
                  disabled={secondsLeft === 0}
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  このテーマを終えて次へ
                </Button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-2">
                <HandwritingCanvas
                  value={handwritingDataUrl}
                  onChange={setHandwritingDataUrl}
                  disabled={isInputDisabled}
                  className="min-h-0 flex-1"
                />
              </div>
            </dialog>
          </div>,
          document.body,
        )}

      {portalReady &&
        isHandwritingFocusActive &&
        isFocusTextOpen &&
        createPortal(
          <div className="fixed inset-0 z-[60] box-border flex h-[100dvh] w-[100vw] items-center justify-center p-4">
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop is decorative (aria-hidden); Escape closes via document listener; dialog has 閉じる */}
            <div
              role="presentation"
              aria-hidden="true"
              className="absolute inset-0 cursor-pointer bg-slate-900/40"
              onClick={() => setIsFocusTextOpen(false)}
            />
            <dialog
              open
              aria-label="集中モードのテキスト入力"
              data-testid="focus-text-modal"
              className="relative z-10 m-0 box-border w-full max-w-2xl rounded-xl border-0 bg-white p-4 shadow-xl outline-none open:block"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  テキスト入力
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFocusTextOpen(false)}
                  aria-label="テキスト入力を閉じる"
                  data-testid="focus-close-text-button"
                >
                  閉じる
                </Button>
              </div>
              <TextEditor
                value={text}
                onChange={setText}
                disabled={isInputDisabled}
                autoFocus
                maxLength={1000}
                className="h-[360px]"
              />
            </dialog>
          </div>,
          document.body,
        )}
    </main>
  );
}
