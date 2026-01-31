import type { Page } from "@playwright/test";

/**
 * IndexedDB をクリアするヘルパー
 * テスト実行前にクリーンな状態にするために使用
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });
}

/**
 * IndexedDB の特定のストアをクリアするヘルパー
 */
export async function clearStore(
  page: Page,
  dbName: string,
  storeName: string
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
    { dbName, storeName }
  );
}
