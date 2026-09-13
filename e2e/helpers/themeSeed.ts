import { expect, type Page } from "@playwright/test";

/**
 * 内蔵テーマ（500件）の初期投入完了まで待つ。
 * Windows 等では初回 IndexedDB 投入が遅くなりやすいため余裕を持たせる。
 */
export const THEME_SEED_TIMEOUT = 90_000;

/**
 * 内蔵テーマの初期投入が完了するまで待つ。
 * トップページの「セッションを開始」が有効になるまで待機する。
 */
export async function waitForThemeSeedReady(page: Page): Promise<void> {
  const startLink = page.getByRole("link", { name: /セッションを開始/ });
  const seedError = page.getByText("初期データの準備に失敗しました");

  try {
    await expect(startLink).toBeEnabled({ timeout: THEME_SEED_TIMEOUT });
  } catch (error) {
    if (await seedError.isVisible().catch(() => false)) {
      throw new Error(
        "Theme seed failed: 「初期データの準備に失敗しました」が表示されています",
      );
    }
    throw error;
  }
}
