了解です！
_履歴一覧_ {{/history}} _向けの SessionCard.tsx_ を、
あなたの現在の設計に合う _シンプル & Tailwind / classcat / Link 対応_ の形で実装します。

---

h1. 📄 {{src/components/history/SessionCard.tsx}}

```'use client';

import React from 'react';
import Link from 'next/link';
import cc from 'classcat';

import { Button } from '@/components/ui/Button';
import type { SessionRecord } from '@/types/session';

export interface SessionCardProps {
  session: SessionRecord;
  href?: string;            // クリック時に飛ぶ先（例: `/history/${session.id}`）
  className?: string;
}

/**
 * セッション履歴一覧で使うカードコンポーネント
 */
export function SessionCard({ session, href, className }: SessionCardProps) {
  const started = session.startedAt ? new Date(session.startedAt) : null;
  const ended = session.endedAt ? new Date(session.endedAt) : null;

  const startedLabel = started ? started.toLocaleString() : '不明';
  const endedLabel = ended ? ended.toLocaleString() : '未完了';

  return (
    <div
      className={cc([
        'rounded-lg border border-slate-200 bg-white p-4 shadow-sm',
        className,
      ])}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* セッション概要 */}
        <div>
          <p className="text-xs font-medium text-slate-500">
            {startedLabel} 開始
            {session.endedAt && ` / ${endedLabel} 終了`}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            テーマ {session.themeIds.length} 件・メモ {session.memoCount} 件
          </p>
        </div>

        {/* アクション */}
        <div className="mt-2 flex gap-2 sm:mt-0">
          {href ? (
            <Button href={href} variant="secondary" size="sm">
              詳細を見る
            </Button>
          ) : (
            <Button
              disabled
              variant="secondary"
              size="sm"
              title="詳細画面への遷移先が設定されていません"
            >
              詳細
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

h1. 🔍 特徴・設計ポイント

### ✔ {{session: SessionRecord}} を丸ごと渡すだけで使える

```<SessionCard session={s} href={`/history/${s.id}`} />

````

### ✔ クリック時の遷移は {{href}}（Buttonの内部で Link 対応）

- カード全体を clickable にするより、
「詳細を見る」ボタンで確実に遷移できるようにしました。

### ✔ classcat / Tailwind によるシンプルなスタイル

- デフォルトは白背景＋影＋罫線
- プロジェクトに合わせて className で追加の margin/padding も可能

### ✔ null / 未完了のときの表示もケア済み

- まだ {{endedAt}} が無いときは「未完了」と表示

----

h1. 🚀 使用例（/history/page.tsx 内）

```<ul className="flex flex-col gap-3">
  {sortedSessions.map(session => (
    <li key={session.id}>
      <SessionCard
        session={session}
        href={`/history/${session.id}`}
      />
    </li>
  ))}
</ul>
````

---
