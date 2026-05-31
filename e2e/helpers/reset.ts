import type { Page } from "@playwright/test";

import { clearTestDataStores } from "./indexeddb";
import { waitForThemeSeedReady } from "./themeSeed";

/**
 * E2E 用のアプリ状態をリセットする。
 * 初回のみテーマシードを待ち、以降は memos/sessions/settings のみクリアする。
 */
export async function resetE2eAppState(page: Page): Promise<void> {
  await page.goto("/");
  await waitForThemeSeedReady(page);
  await clearTestDataStores(page);
  await page.reload();
  await waitForThemeSeedReady(page);
}
