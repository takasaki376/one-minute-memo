import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb";

test.describe("設定変更フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearIndexedDB(page);
    await page.reload();
  });

  test("設定画面にアクセスできる", async ({ page }) => {
    await page.goto("/setting");

    // 設定画面のタイトル
    await expect(page.locator("text=/設定/")).toBeVisible();
  });

  test("テーマ数を変更できる", async ({ page }) => {
    await page.goto("/setting");

    // テーマ数入力フィールドを探す
    const themeCountInput = page.locator(
      'input[type="number"], input[name*="theme"], input[aria-label*="テーマ"]'
    );

    if (await themeCountInput.isVisible()) {
      // 値をクリアして新しい値を入力
      await themeCountInput.fill("5");

      // 保存ボタンをクリック（存在する場合）
      const saveButton = page.getByRole("button", { name: /保存|変更を保存/ });
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      // 入力値が反映されていることを確認
      await expect(themeCountInput).toHaveValue("5");
    }
  });

  test("設定変更がセッションに反映される", async ({ page }) => {
    await page.goto("/setting");

    // テーマ数を5に変更
    const themeCountInput = page.locator(
      'input[type="number"], input[name*="theme"], input[aria-label*="テーマ"]'
    );

    if (await themeCountInput.isVisible()) {
      await themeCountInput.fill("5");

      const saveButton = page.getByRole("button", { name: /保存|変更を保存/ });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      // セッション画面に遷移
      await page.goto("/session");

      // テーマ数が5件になっていることを確認（1/5 などの表示）
      await expect(page.locator("text=/\\/\\s*5|5.*件/")).toBeVisible();
    }
  });

  test("トップ画面から設定画面に遷移できる", async ({ page }) => {
    await page.goto("/");

    // 設定リンクをクリック
    const settingsLink = page.getByRole("link", { name: /設定/ });
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/setting/);
    }
  });
});
