いいですね、ここまで来たら IndexedDB にちゃんとつなげたくなりますよね。
{{saveMemo / createSession / completeSession}} *を使ってセッション画面から IndexedDB を叩く流れ*を、サンプル実装付きでまとめます。

----

## 1️⃣ 型定義（{{SessionRecord}} / {{MemoRecord}}）

まずは型を決めておきます。

### {{src/types/session.ts}}

```export interface SessionRecord {
  id: string;
  /** このセッションで使うテーマIDの一覧（順番含む） */
  themeIds: string[];
  /** セッション開始時刻（ISO文字列） */
  startedAt: string;
  /** セッション終了時刻（まだなら null） */
  endedAt: string | null;
  /** 紐づくメモの数 */
  memoCount: number;
}
```

### {{src/types/memo.ts}}

```export type HandwritingType = 'none' | 'dataUrl';

export interface MemoRecord {
  id: string;
  sessionId: string;
  themeId: string;
  /** セッション内での何番目のテーマか（1〜） */
  order: number;
  textContent: string;
  handwritingType: HandwritingType;
  handwritingDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

----

## 2️⃣ Repository 実装（IndexedDB 用）

ここでは「{{getDB()}} が {{sessions}} / {{memos}} ストアを持っている前提」で書きます。
（{{openDB.ts}} 側で objectStore 作成済みという前提）

### {{src/lib/db/sessionsRepo.ts}}

```import { SessionRecord } from '@/types/session';
import { getDB } from './openDB';

const SESSION_STORE = 'sessions';

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** テーマID一覧から新しいセッションを作成して保存 */
export async function createSession(themeIds: string[]): Promise<SessionRecord> {
  const db = await getDB();
  const now = new Date().toISOString();

  const session: SessionRecord = {
    id: generateId(),
    themeIds,
    startedAt: now,
    endedAt: null,
    memoCount: 0,
  };

  const tx = db.transaction(SESSION_STORE, 'readwrite');
  await tx.store.add(session);
  await tx.done;

  return session;
}

/** セッションを終了状態に更新（memoCount も更新） */
export async function completeSession(
  sessionId: string,
  memoCount: number,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(SESSION_STORE, 'readwrite');
  const store = tx.store;

  const existing = (await store.get(sessionId)) as SessionRecord | undefined;
  if (!existing) {
    console.warn('completeSession: session not found', sessionId);
    await tx.done;
    return;
  }

  const updated: SessionRecord = {
    ...existing,
    memoCount,
    endedAt: new Date().toISOString(),
  };

  await store.put(updated);
  await tx.done;
}
```

----

### {{src/lib/db/memosRepo.ts}}

```import { MemoRecord } from '@/types/memo';
import { getDB } from './openDB';

const MEMO_STORE = 'memos';

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `memo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * メモを保存（同じ id があれば上書き）
 * 呼び出し側で id を決めてもいいし、任せてもOKなようにしている。
 */
export async function saveMemo(
  memo: Omit<MemoRecord, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  },
): Promise<MemoRecord> {
  const db = await getDB();
  const now = new Date().toISOString();

  const record: MemoRecord = {
    id: memo.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
    ...memo,
  };

  const tx = db.transaction(MEMO_STORE, 'readwrite');
  await tx.store.put(record);
  await tx.done;

  return record;
}
```

{quote}🔎 メモ：

- 呼び出し側で {{id}} を決めたい場合は {{id}} を渡せる
- 特にこだわらなければ repo 側で {{randomUUID()}} を生成{quote}

----

## 3️⃣ セッション画面への「差し込み」

先に出した {{/session/page.tsx}} の骨組みに、
{{createSession}} */* {{saveMemo}} */* {{completeSession}} *を組み込んだ版*です。

### 📄 {{src/app/session/page.tsx}}（IndexedDB 連携版）

```'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { TextEditor } from '@/components/session/TextEditor';
import { HandwritingCanvas } from '@/components/session/HandwritingCanvas';
import { useCountdown } from '@/lib/timer/useCountdown';
import { createSession, completeSession } from '@/lib/db/sessionsRepo';
import { saveMemo } from '@/lib/db/memosRepo';
// TODO: テーマも IndexedDB から取得する場合は有効化
// import { getActiveThemes } from '@/lib/db/themesRepo';

type SessionStage = 'loading' | 'running' | 'finished' | 'error';

interface SessionTheme {
  id: string;
  title: string;
  category?: string;
}

/** MVP用: とりあえず固定テーマからランダムで10件選ぶ */
const MOCK_THEMES: SessionTheme[] = [
  { id: 't1', title: '今日やることを箇条書きで書き出す', category: '目標' },
  { id: 't2', title: '今気になっていることを全部書く', category: '感情' },
  { id: 't3', title: '今週の振り返りを書く', category: '振り返り' },
  { id: 't4', title: '最近の仕事でうまくいったこと', category: '仕事' },
  { id: 't5', title: '最近の仕事でうまくいかなかったこと', category: '仕事' },
  { id: 't6', title: '今悩んでいることを具体的に書く', category: '感情' },
  { id: 't7', title: '1年後にどうなっていたいか', category: '目標' },
  { id: 't8', title: '大事にしたい価値観を書き出す', category: '自己理解' },
  { id: 't9', title: '最近楽しかったこと', category: '生活・健康' },
  { id: 't10', title: '最近モヤモヤした出来事', category: '感情' },
];

const TOTAL_THEMES_PER_SESSION = 10;
const SECONDS_PER_THEME = 60;

/** 配列をシャッフルして先頭N件を返す */
function pickRandomThemes(
  allThemes: SessionTheme[],
  count: number,
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
  const [stage, setStage] = useState<SessionStage>('loading');
  const [themes, setThemes] = useState<SessionTheme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 0〜N-1
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);

  // --- 現在テーマの入力状態 ---
  const [text, setText] = useState('');
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(
    null,
  );

  // タイマー
  const { secondsLeft, isRunning, start, reset } = useCountdown({
    initialSeconds: SECONDS_PER_THEME,
    autoStart: false,
    onFinish: () => {
      void handleThemeFinishedAuto();
    },
  });

  const currentTheme = useMemo(
    () => themes[currentIndex] ?? null,
    [themes, currentIndex],
  );

  // セッション開始時の初期化
  useEffect(() => {
    const init = async () => {
      try {
        setStage('loading');

        // TODO: 本番では IndexedDB の有効テーマから取得
        // const activeThemes = await getActiveThemes();
        // const selected = pickRandomThemes(activeThemes, TOTAL_THEMES_PER_SESSION);
        const selected = pickRandomThemes(
          MOCK_THEMES,
          TOTAL_THEMES_PER_SESSION,
        );

        if (selected.length === 0) {
          setStage('error');
          return;
        }

        setThemes(selected);
        setCurrentIndex(0);

        // セッションを作成して IndexedDB に保存
        const session = await createSession(selected.map(t => t.id));
        setSessionId(session.id);

        // 最初のテーマ用に入力状態をリセット
        reset(SECONDS_PER_THEME);
        setText('');
        setHandwritingDataUrl(null);

        // タイマー開始
        start();
        setStage('running');
      } catch (e) {
        console.error('Failed to init session', e);
        setStage('error');
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLastTheme =
    themes.length > 0 && currentIndex === themes.length - 1;

  // 現在テーマのメモを IndexedDB に保存
  const saveCurrentMemo = async () => {
    if (!currentTheme || !sessionId) return;

    await saveMemo({
      sessionId,
      themeId: currentTheme.id,
      order: currentIndex + 1,
      textContent: text,
      handwritingType: handwritingDataUrl ? 'dataUrl' : 'none',
      handwritingDataUrl: handwritingDataUrl ?? undefined,
    });

    setMemoCount(prev => prev + 1);
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
    await saveCurrentMemo();

    if (isLastTheme) {
      await handleSessionComplete();
      return;
    }

    // 次のテーマへ
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setText('');
    setHandwritingDataUrl(null);

    // タイマーをリセットして開始
    reset(SECONDS_PER_THEME);
    start();
  };

  // セッション完了時の処理
  const handleSessionComplete = async () => {
    setStage('finished');

    if (sessionId) {
      // 最後のメモを含めた数でセッションを完了状態に更新
      await completeSession(sessionId, memoCount + 1);
    }

    // 完了画面へ遷移
    router.push('/session/complete');
  };

  // デバッグ & ガード
  if (stage === 'loading') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">セッションを準備中...</h1>
        <p className="mt-2 text-sm text-slate-600">
          テーマを読み込んでいます。
        </p>
      </main>
    );
  }

  if (stage === 'error' || !currentTheme) {
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
          <p className="text-xs font-medium text-slate-500">
            テーマ {currentNumber} / {total}
          </p>
          <p className="text-xs font-medium text-slate-500">
            残り{' '}
            <span className="tabular-nums text-lg font-semibold text-slate-900">
              {secondsLeft}
            </span>{' '}
            秒
          </p>
        </div>
        <div>
          {currentTheme.category && (
            <p className="text-xs font-semibold text-blue-600">
              {currentTheme.category}
            </p>
          )}
          <h1 className="mt-1 text-lg font-semibold text-slate-900">
            {currentTheme.title}
          </h1>
        </div>
      </header>

      {/* 入力エリア */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-700">
            テキストメモ
          </h2>
          <TextEditor
            value={text}
            onChange={setText}
            autoFocus
            disabled={stage !== 'running' || secondsLeft === 0}
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
            disabled={stage !== 'running' || secondsLeft === 0}
          />
        </div>
      </section>

      {/* フッター操作 */}
      <footer className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="text-xs text-slate-500">
          {isRunning ? '入力中…' : '一時停止中'}
        </div>
        <div className="flex gap-2">
          {/* デバッグ用：一時停止/再開（必要なら useCountdown から pause をexportして使う） */}
          <Button
            variant="ghost"
            onClick={() => {
              if (!isRunning) {
                start();
              }
              // pause() を使う場合は useCountdown から取り出してここで呼ぶ
            }}
          >
            {isRunning ? '（未実装）一時停止' : '再開'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleThemeFinished({ triggeredByUser: true })}
          >
            このテーマを終了して次へ
          </Button>
        </div>
      </footer>
    </main>
  );
}
```

----

## ✅ これで「差し込み」完了後にできること

- セッション開始時に {{sessions}} ストアへ 1レコード追加
- 各テーマ終了ごとに {{memos}} ストアへ 1レコード追加
- セッション完了時に {{completeSession}} で {{endedAt}} & {{memoCount}} 更新

あとは：

- {{/history}} 画面で {{sessions}} / {{memos}} を読み出して表示
- 将来 Supabase 導入時に、同じ {{SessionRecord}} / {{MemoRecord}} をサーバ側にも同期

みたいな流れで拡張できます。

次は、履歴一覧／履歴詳細でこれらを読むための
{{getSessions}} / {{getMemosBySessionId}} みたいな repo 関数と画面骨組みも一緒に作っていきましょうか？
