'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCountdown } from '@/lib/timer/useCountdown';
import { selectRandomThemes } from '@/lib/utils/selectRandomThemes';
import type { ThemeRecord } from '@/types/theme';
import type { SessionRecord } from '@/types/session';

export default function SessionPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentTheme = themes[currentThemeIndex];
  const isLastTheme = currentThemeIndex === themes.length - 1;

  // タイマー終了時の処理
  const handleTimerFinish = async () => {
    if (!sessionId || !currentTheme) return;

    try {
      // メモを保存
      const { saveMemo } = await import('@/lib/db/memosRepo');
      await saveMemo({
        id: `memo-${Date.now()}-${currentThemeIndex + 1}`,
        sessionId,
        themeId: currentTheme.id,
        order: currentThemeIndex + 1,
        textContent,
        handwritingType: handwritingDataUrl ? 'dataUrl' : 'none',
        handwritingDataUrl: handwritingDataUrl || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 最後のテーマの場合、セッション完了
      if (isLastTheme) {
        const { completeSession } = await import('@/lib/db/sessionsRepo');
        await completeSession(sessionId, themes.length);
        router.push('/session/complete');
        return;
      }

      // 次のテーマへ
      setCurrentThemeIndex(prev => prev + 1);
      setTextContent('');
      setHandwritingDataUrl(null);
      countdown.reset(60);
      countdown.start();
    } catch (err) {
      console.error('Failed to save memo:', err);
      setError('メモの保存に失敗しました');
    }
  };

  const countdown = useCountdown({
    initialSeconds: 60,
    autoStart: false,
    onFinish: handleTimerFinish,
  });

  // セッション開始時の初期化
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // 有効なテーマを取得
        const { getActiveThemes } = await import('@/lib/db/themesRepo');
        const activeThemes = await getActiveThemes();

        if (activeThemes.length === 0) {
          setError('有効なテーマがありません。テーマ管理画面でテーマを有効化してください。');
          setIsInitializing(false);
          return;
        }

        // ランダムに10件選ぶ
        const selectedThemes = selectRandomThemes(activeThemes, 10);
        setThemes(selectedThemes);

        if (selectedThemes.length === 0) {
          setError('テーマの選択に失敗しました');
          setIsInitializing(false);
          return;
        }

        // セッションを作成
        const { createSession } = await import('@/lib/db/sessionsRepo');
        const session = await createSession(
          selectedThemes.map(t => t.id),
        );
        setSessionId(session.id);

        // タイマー開始
        countdown.start();
        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setError('セッションの開始に失敗しました');
        setIsInitializing(false);
      }
    };

    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">セッションを準備しています...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!currentTheme) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">テーマが見つかりません</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-4xl mx-auto">
      {/* ヘッダー: テーマ情報とタイマー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-600">
            {currentThemeIndex + 1} / {themes.length}
          </div>
          <div className="text-2xl font-bold">
            {countdown.secondsLeft}秒
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1">{currentTheme.title}</h1>
        <div className="text-sm text-slate-500">{currentTheme.category}</div>
      </div>

      {/* テキスト入力エリア */}
      <div className="flex-1 mb-4">
        <textarea
          value={textContent}
          onChange={e => setTextContent(e.target.value)}
          placeholder="ここにメモを書いてください..."
          className="w-full h-64 p-4 border border-slate-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!countdown.isRunning}
        />
      </div>

      {/* 手書きキャンバス（簡易版） */}
      <div className="mb-4">
        <div className="border border-slate-300 rounded-md p-4 bg-white">
          <div className="text-sm text-slate-600 mb-2">手書き入力（実装予定）</div>
          <canvas
            className="border border-slate-200 rounded w-full"
            style={{ height: '200px' }}
          />
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            handleTimerFinish();
          }}
          disabled={!countdown.isRunning}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastTheme ? '完了' : '次へ'}
        </button>
        <button
          onClick={() => {
            countdown.pause();
          }}
          disabled={!countdown.isRunning}
          className="px-6 py-2 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          一時停止
        </button>
        <button
          onClick={() => {
            countdown.start();
          }}
          disabled={countdown.isRunning}
          className="px-6 py-2 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          再開
        </button>
      </div>
    </div>
  );
}
