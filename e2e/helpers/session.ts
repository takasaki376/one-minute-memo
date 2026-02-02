import type { Page } from "@playwright/test";

/**
 * セッション画面のテーマインジケータ（例: 1 / 10）から総テーマ数を取得する。
 * 設定でテーマ数が変更されていてもテストが通るようにする。
 */
export async function getThemeTotal(page: Page): Promise<number> {
  const indicator = page.locator("text=/1\\s*\\/\\s*\\d+/");
  await indicator.first().waitFor({ state: "visible", timeout: 10000 });
  const text = await indicator.first().textContent();
  const match = text?.replace(/\s/g, "").match(/1\/(\d+)/);
  return Number.parseInt(match?.[1] ?? "10", 10);
}
