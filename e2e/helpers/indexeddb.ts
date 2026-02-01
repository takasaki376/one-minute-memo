import type { Page } from "@playwright/test";

/**
 * IndexedDB をクリアするヘルパー
 * テスト実行前にクリーンな状態にするために使用
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // まず、開いているすべてのデータベース接続を閉じる
    const databases = await indexedDB.databases();

    // 各データベースを開いて閉じることで、既存の接続をクリア
    for (const db of databases) {
      if (db.name) {
        try {
          const openRequest = indexedDB.open(db.name);
          await new Promise<void>((resolve) => {
            openRequest.onsuccess = () => {
              openRequest.result.close();
              resolve();
            };
            openRequest.onerror = () => {
              resolve(); // エラーでも続行
            };
          });
        } catch (e) {
          // 無視
        }
      }
    }

    // 少し待機してから削除を試みる
    await new Promise((resolve) => setTimeout(resolve, 100));

    const deletePromises: Promise<void>[] = [];
    for (const db of databases) {
      if (db.name) {
        deletePromises.push(
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name!);
            request.onsuccess = () => {
              resolve();
            };
            request.onerror = () => {
              reject(request.error);
            };
            request.onblocked = () => {
              // ブロックされた場合は一定時間待ってから解決
              setTimeout(() => resolve(), 1000);
            };
          }),
        );
      }
    }
    await Promise.all(deletePromises);
  });
}

/**
 * IndexedDB の特定のストアをクリアするヘルパー
 */
export async function clearStore(
  page: Page,
  dbName: string,
  storeName: string,
): Promise<void> {
  await page.evaluate(
    async ({ dbName, storeName }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          store.clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    },
    { dbName, storeName },
  );
}
