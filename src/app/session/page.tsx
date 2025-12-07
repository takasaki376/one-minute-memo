"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { TextEditor } from "@/components/session/TextEditor";
import { HandwritingCanvas } from "@/components/session/HandwritingCanvas";
import { useCountdown } from "@/lib/timer/useCountdown";
// TODO: IndexedDB連携時に有効化する
// import { getActiveThemes } from '@/lib/db/themesRepo';
// import { createSession, completeSession } from '@/lib/db/sessionsRepo';
// import { saveMemo } from '@/lib/db/memosRepo';

type SessionStage = "loading" | "running" | "finished" | "error";

interface SessionTheme {
  id: string;
  title: string;
  category?: string;
}

/** MVP用: とりあえず固定テーマからランダムで10件選ぶ */
const MOCK_THEMES: SessionTheme[] = [
  { id: "t1", title: "今日やることを箇条書きで書き出す", category: "目標" },
  { id: "t2", title: "今気になっていることを全部書く", category: "感情" },
  { id: "t3", title: "今週の振り返りを書く", category: "振り返り" },
  { id: "t4", title: "最近の仕事でうまくいったこと", category: "仕事" },
  { id: "t5", title: "最近の仕事でうまくいかなかったこと", category: "仕事" },
  { id: "t6", title: "今悩んでいることを具体的に書く", category: "感情" },
  { id: "t7", title: "1年後にどうなっていたいか", category: "目標" },
  { id: "t8", title: "大事にしたい価値観を書き出す", category: "自己理解" },
  { id: "t9", title: "最近楽しかったこと", category: "生活・健康" },
  { id: "t10", title: "最近モヤモヤした出来事", category: "感情" },
  // …本番は200テーマ＋カテゴリマスタから取得
];

const TOTAL_THEMES_PER_SESSION = 10;
const SECONDS_PER_THEME = 60;

/** 配列をシャッフルして先頭N件を返す */
function pickRandomThemes(
  allThemes: SessionTheme[],
  count: number
): SessionTheme[] {
  const copy = [...allThemes];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export default function SessionPage() {
  const router = useRouter();

  // --- セッション全体の状態 ---
  const [stage, setStage] = useState<SessionStage>("loading");
  const [themes, setThemes] = useState<SessionTheme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 0〜N-1
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);

  // --- 現在テーマの入力状態 ---
  const [text, setText] = useState("");
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(
    null
  );

  const currentTheme = useMemo(
    () => themes[currentIndex] ?? null,
    [themes, currentIndex]
  );

  const isLastTheme = themes.length > 0 && currentIndex === themes.length - 1;

  // 現在テーマのメモを保存する（DB連携は TODO）
  const saveCurrentMemo = async () => {
    if (!currentTheme || !sessionId) return;

    // TODO: IndexedDB memos ストアに保存
    // await saveMemo({
    //   id: `memo-${sessionId}-${currentTheme.id}`,
    //   sessionId,
    //   themeId: currentTheme.id,
    //   order: currentIndex + 1,
    //   textContent: text,
    //   handwritingType: handwritingDataUrl ? 'dataUrl' : 'none',
    //   handwritingDataUrl: handwritingDataUrl ?? undefined,
    //   createdAt: new Date().toISOString(),
    //   updatedAt: new Date().toISOString(),
    // });

    // MVPではコンソールに吐くだけ
    console.log("SAVE MEMO", {
      sessionId,
      themeId: currentTheme.id,
      order: currentIndex + 1,
      text,
      handwritingDataUrl,
    });

    setMemoCount((prev) => prev + 1);
  };

  // セッション完了時の処理
  const handleSessionComplete = async () => {
    setStage("finished");
    // TODO: completeSession(sessionId, memoCount + 1) を呼ぶ（最後の分も含む）

    console.log("SESSION COMPLETE", { sessionId, memoCount: memoCount + 1 });

    // 完了画面へ遷移
    router.push("/session/complete");
  };

  // 「次へ」ボタン or タイマー終了時の共通処理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleThemeFinished = async (options?: {
    triggeredByUser?: boolean;
  }) => {
    if (!currentTheme) return;

    // 現在のメモを保存
    await saveCurrentMemo();

    if (isLastTheme) {
      await handleSessionComplete();
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

  // タイマー終了で自動的に次へ進むとき
  const handleThemeFinishedAuto = async () => {
    await handleThemeFinished({ triggeredByUser: false });
  };

  // タイマー
  const { secondsLeft, isRunning, start, reset, pause } = useCountdown({
    initialSeconds: SECONDS_PER_THEME,
    autoStart: false, // テーマ準備が終わってから start する
    onFinish: handleThemeFinishedAuto,
  });

  // セッション開始時の初期化
  useEffect(() => {
    const init = async () => {
      try {
        setStage("loading");

        // TODO: 本番では IndexedDB から有効テーマを取得
        // const activeThemes = await getActiveThemes();
        // const selected = pickRandomThemes(activeThemes, TOTAL_THEMES_PER_SESSION);
        const selected = pickRandomThemes(
          MOCK_THEMES,
          TOTAL_THEMES_PER_SESSION
        );

        if (selected.length === 0) {
          setStage("error");
          return;
        }

        setThemes(selected);
        setCurrentIndex(0);

        // TODO: DBにセッションを作成
        // const session = await createSession(selected.map(t => t.id));
        // setSessionId(session.id);
        setSessionId(`debug-session-${Date.now()}`);

        // 最初のテーマ用に入力状態をリセット
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
    // reset と start は useCallback でメモ化されているため、依存配列に追加しても問題ない
  }, [reset, start]);

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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      {/* ヘッダー（テーマ + カウンタ + タイマー） */}
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            テーマ {currentNumber} / {total}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            残り{" "}
            <span className="tabular-nums text-lg font-semibold text-slate-900 dark:text-slate-100">
              {secondsLeft}
            </span>{" "}
            秒
          </p>
        </div>
        <div>
          {currentTheme.category && (
            <p className="text-xs font-semibold text-blue-600">
              {currentTheme.category}
            </p>
          )}
          <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {currentTheme.title}
          </h1>
        </div>
      </header>

      {/* 入力エリア */}
      <section className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              テキストメモ
            </h2>
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                disabled={stage !== "running" || secondsLeft === 0}
                className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                クリア
              </button>
            )}
          </div>
          <TextEditor
            value={text}
            onChange={setText}
            autoFocus
            disabled={stage !== "running" || secondsLeft === 0}
            placeholder="思いつくことをできるだけ書き出してみましょう"
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            手書きメモ（任意）
          </h2>
          <HandwritingCanvas
            value={handwritingDataUrl}
            onChange={setHandwritingDataUrl}
            disabled={stage !== "running" || secondsLeft === 0}
          />
        </div>
      </section>

      {/* フッター操作 */}
      <footer className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {isRunning ? "入力中…" : "一時停止中"}
        </div>
        <div className="flex gap-2">
          {/* デバッグ / 操作用ボタン（MVPでは残しておくと便利） */}
          <Button
            variant="outline"
            onClick={() => {
              if (isRunning) {
                pause();
              } else {
                start();
              }
            }}
          >
            {isRunning ? "一時停止" : "再開"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (secondsLeft === 0) return;
              handleThemeFinished({ triggeredByUser: true });
            }}
          >
            このテーマを終了して次へ
          </Button>
        </div>
      </footer>
    </main>
  );
}
