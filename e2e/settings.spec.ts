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
    await expect(page.getByRole("heading", { name: "設定", level: 1 })).toBeVisible();
  });

  test("テーマ数を変更できる", async ({ page }) => {
    await page.goto("/setting");

    // テーマ数入力フィールドを必須要素として担保
    const themeCountInput = page.locator(
      'input[type="number"]#theme-count, input[id="theme-count"]'
    ).first();
    await expect(themeCountInput).toBeVisible();

    await themeCountInput.fill("5");
    // InputTargetCount は onBlur で保存するため、blur をトリガー
    await themeCountInput.blur();

    await expect(themeCountInput).toHaveValue("5");
  });

  test("設定変更がセッションに反映される", async ({ page }) => {
    await page.goto("/setting");

    const themeCountInput = page.locator(
      'input[type="number"]#theme-count, input[id="theme-count"]'
    ).first();
    await expect(themeCountInput).toBeVisible();

    await themeCountInput.fill("5");
    await themeCountInput.blur();

    await page.goto("/session");

    // 設定が反映されていればテーマインジケータが 1 / 5 になる
    await expect(page.locator("text=/1\\s*\\/\\s*5/")).toBeVisible({
      timeout: 5000,
    });
  });

  test("トップ画面から設定画面に遷移できる", async ({ page }) => {
    await page.goto("/");

    // 設定リンクをクリック（ヘッダーとメインの2つあるので先頭をクリック）
    const settingsLink = page.getByRole("link", { name: "設定" }).first();
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await expect(page).toHaveURL(/\/setting/);
  });
});
