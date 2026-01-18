'use client';

import { useEffect, useState } from 'react';
import { getAllSessionsSorted } from '@/lib/db/sessionsRepo';
import type { SessionRecord } from '@/types/session';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DebugSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 開発環境でのみアクセス可能にする
    if (process.env.NODE_ENV !== 'development') {
      router.push('/');
      return;
    }
    const loadSessions = async () => {
      try {
        const data = await getAllSessionsSorted();
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">セッション一覧（デバッグ用）</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">セッション一覧（デバッグ用）</h1>
      
      {sessions.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            セッションがまだ作成されていません。
            <br />
            <Link href="/session" className="text-blue-600 underline">
              セッションを開始
            </Link>
            してから、このページに戻ってください。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {sessions.length} 件のセッションが見つかりました
          </p>
          <div className="space-y-2">
            {sessions.map((session) => {
              const started = new Date(session.startedAt);
              const url = `/history/${session.id}`;
              return (
                <div
                  key={session.id}
                  className="border border-slate-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-slate-600 mb-1">
                        {session.id}
                      </p>
                      <p className="text-sm text-slate-800">
                        {started.toLocaleString('ja-JP')} 開始
                        {session.endedAt && (
                          <> / {new Date(session.endedAt).toLocaleString('ja-JP')} 終了</>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        メモ: {session.memoCount} 件 / テーマ: {session.themeIds.length} 個
                      </p>
                    </div>
                    <Link
                      href={url}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      詳細を見る
                    </Link>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 font-mono break-all">
                      URL: {url}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="mt-8 pt-8 border-t border-slate-200">
        <Link href="/" className="text-blue-600 hover:underline">
          ← トップに戻る
        </Link>
      </div>
    </div>
  );
}
