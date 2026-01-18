# セッションIDの確認方法

## 方法1: ブラウザの開発者ツールで確認

1. ブラウザでアプリを開く（例: `http://localhost:3000`）
2. 開発者ツールを開く（F12 または Cmd+Option+I）
3. **Application** タブ（Chrome）または **Storage** タブ（Firefox）を開く
4. 左側のメニューから **IndexedDB** → **one-minute-memo-db** → **sessions** を選択
5. 保存されているセッションの `id` を確認

## 方法2: ブラウザのコンソールで確認

開発者ツールの **Console** タブで以下のコードを実行：

```javascript
// IndexedDBからセッション一覧を取得
// indexedDB.openはPromiseを直接返さないため、Promiseラッパーを使用
const request = indexedDB.open('one-minute-memo-db', 2);
const db = await new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const tx = db.transaction('sessions', 'readonly');
const store = tx.objectStore('sessions');
const sessions = await new Promise((resolve, reject) => {
  const req = store.getAll();
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

console.log('セッション一覧:', sessions);
console.log('セッションID:', sessions.map(s => s.id));
```

## 方法3: セッションを作成してIDを確認

1. アプリでセッションを開始する
2. セッション完了画面で、ブラウザのコンソールを開く
3. 以下のコードでセッションIDを確認：

```javascript
// 最新のセッションIDを取得
// indexedDB.openはPromiseを直接返さないため、Promiseラッパーを使用
const request = indexedDB.open('one-minute-memo-db', 2);
const db = await new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const tx = db.transaction('sessions', 'readonly');
const store = tx.objectStore('sessions');
const index = store.index('by_startedAt');

const sessions = await new Promise((resolve, reject) => {
  const req = index.getAll();
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
const latestSession = sessions[0];
console.log('最新のセッションID:', latestSession.id);
console.log('URL:', `http://localhost:3000/history/${latestSession.id}`);
```

**推奨方法**: アプリケーション内で実行する場合は、`getAllSessionsSorted()` 関数を使用することを推奨します（`src/lib/db/sessionsRepo.ts` を参照）。

## URL形式

履歴詳細ページのURLは以下の形式です：

```
http://localhost:3000/history/[セッションID]
```

例：
```
http://localhost:3000/history/sess-1735123456789
```

## 注意

- セッションIDは `sess-` で始まるタイムスタンプ形式です
- セッションが存在しない場合は、エラーメッセージが表示されます
