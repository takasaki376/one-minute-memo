import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * セッション画面のテーマインジケータ（例: 1 / 10）から総テーマ数を取得する。
 * 設定でテーマ数が変更されていてもテストが通るようにする。
 */
export async function getThemeTotal(page: Page): Promise<number> {
  const indicator = page.locator("text=/1\\s*\\/\\s*\\d+/ >> visible=true");
  await indicator.first().waitFor({ state: "visible", timeout: 10000 });
  const text = await indicator.first().textContent();
  const match = text?.replace(/\s/g, "").match(/1\/(\d+)/);
  return Number.parseInt(match?.[1] ?? "10", 10);
}

/**
 * レイアウト（モバイル/タブレット・PC）差分を吸収して
 * 入力可能なテキストエリアを返す。
 */
export async function getVisibleSessionTextarea(page: Page) {
  const textTab = page.getByRole("tab", { name: "テキスト入力" });
  if ((await textTab.count()) > 0) {
    await textTab.click();
  }

  const textarea = page.locator("textarea:visible").first();
  await expect(textarea).toBeVisible();
  return textarea;
}
