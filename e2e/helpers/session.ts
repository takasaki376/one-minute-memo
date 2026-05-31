import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** セッション画面の UI 待機タイムアウト（Windows 等の遅い環境向け） */
export const SESSION_UI_TIMEOUT = 15000;

/**
 * テーマ進捗（例: 1 / 10）のロケータ。
 * ThemeHeader は md ブレークポイント用に同一テキストを2つDOMへ出すため、
 * visible のみに絞って strict mode violation を避ける。
 */
export function themeProgressLocator(
  page: Page,
  current: number,
  total: number,
) {
  return page
    .locator(`text=/${current}\\s*\\/\\s*${total}/ >> visible=true`)
    .first();
}

/**
 * セッション画面のテーマインジケータ（例: 1 / 10）から総テーマ数を取得する。
 * 設定でテーマ数が変更されていてもテストが通るようにする。
 */
export async function getThemeTotal(page: Page): Promise<number> {
  const indicator = page.locator("text=/1\\s*\\/\\s*\\d+/ >> visible=true").first();
  await indicator.waitFor({ state: "visible", timeout: SESSION_UI_TIMEOUT });
  const text = await indicator.textContent();
  const match = text?.replace(/\s/g, "").match(/1\/(\d+)/);
  return Number.parseInt(match?.[1] ?? "10", 10);
}

export async function getVisibleSessionTextarea(page: Page) {
  // セッションUIの操作領域が出るまで待つ（初期ロード中の取りこぼしを防ぐ）
  await expect(page.locator('[data-testid="session-controls"]')).toBeVisible({
    timeout: SESSION_UI_TIMEOUT,
  });

  const textTab = page.getByRole("tab", { name: "テキスト入力" });
  if ((await textTab.count()) > 0 && (await textTab.first().isVisible())) {
    await textTab.click();
  } else {
    const openTextButton = page.getByRole("button", {
      name: "テキスト入力を開く",
    });
    if (
      (await openTextButton.count()) > 0 &&
      (await openTextButton.first().isVisible())
    ) {
      await openTextButton.click();
    }
  }

  const splitTextarea = page
    .locator('[data-testid="split-text-panel"]:not([hidden]) textarea')
    .first();
  if (await splitTextarea.isVisible()) {
    return splitTextarea;
  }

  const focusTextarea = page
    .locator('[data-testid="focus-text-modal"] textarea')
    .first();
  await expect(focusTextarea).toBeVisible({ timeout: SESSION_UI_TIMEOUT });
  return focusTextarea;
}
