import { expect, type Page } from "@playwright/test";

/**
 * 内蔵テーマの初期投入が完了するまで待つ。
 * トップページの「セッションを開始」が有効になるまで待機する。
 */
export async function waitForThemeSeedReady(page: Page): Promise<void> {
  const startLink = page.getByRole("link", { name: /セッションを開始/ });
  await expect(startLink).toBeEnabled({ timeout: 30000 });
}
