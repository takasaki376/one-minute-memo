import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb";
import { getThemeTotal } from "./helpers/session";

test.describe("履歴確認フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearIndexedDB(page);
    await page.reload();
  });

  test("履歴がない状態で空メッセージが表示される", async ({ page }) => {
    await page.goto("/history");

    // 空状態のメッセージ
    await expect(
      page.locator("text=/履歴がありません|セッション履歴がありません/")
    ).toBeVisible();
  });

  test("セッション完了後、履歴一覧に表示される", async ({ page }) => {
    await page.goto("/session");
    const total = await getThemeTotal(page);

    for (let i = 0; i < total; i++) {
      const nextButton = page.getByRole("button", {
        name: /次へ|終了して次へ|このテーマを終了/,
      });
      await nextButton.click();
      if (i < total - 1) {
        const nextIndex = i + 2;
        await expect(
          page.locator(`text=/${nextIndex}\\s*\\/\\s*${total}/`),
        ).toBeVisible({ timeout: 5000 });
      }
    }
    await expect(page).toHaveURL(/\/session\/complete/);

    // 履歴一覧に遷移
    await page.getByRole("link", { name: /履歴一覧/ }).click();

    // 履歴一覧画面
    await expect(page).toHaveURL(/\/history/);

    // セッションカードが表示される
    await expect(page.locator("text=/テーマ.*件|メモ.*件/")).toBeVisible();
  });

  test("履歴詳細画面でメモ一覧が表示される", async ({ page }) => {
    await page.goto("/session");
    const total = await getThemeTotal(page);

    const textarea = page.locator("textarea");
    await textarea.fill("テスト用メモ内容");

    for (let i = 0; i < total; i++) {
      const nextButton = page.getByRole("button", {
        name: /次へ|終了して次へ|このテーマを終了/,
      });
      await nextButton.click();
      if (i < total - 1) {
        const nextIndex = i + 2;
        await expect(
          page.locator(`text=/${nextIndex}\\s*\\/\\s*${total}/`),
        ).toBeVisible({ timeout: 5000 });
      }
    }
    await expect(page).toHaveURL(/\/session\/complete/);

    // 「このセッションの詳細を見る」または履歴一覧経由で詳細へ
    const detailLink = page.getByRole("link", {
      name: /詳細を見る|このセッションの詳細/,
    });
    if (await detailLink.isVisible()) {
      await detailLink.click();
    } else {
      // 履歴一覧経由
      await page.getByRole("link", { name: /履歴一覧/ }).click();
      await page.getByRole("link", { name: /詳細を見る/ }).first().click();
    }

    // 履歴詳細画面
    await expect(page).toHaveURL(/\/history\/.+/);

    // メモ一覧が表示される（見出しで一意に特定）
    await expect(page.getByRole("heading", { name: "メモ一覧" })).toBeVisible();
  });

  test("履歴詳細から履歴一覧に戻れる", async ({ page }) => {
    await page.goto("/session");
    const total = await getThemeTotal(page);

    for (let i = 0; i < total; i++) {
      const nextButton = page.getByRole("button", {
        name: /次へ|終了して次へ|このテーマを終了/,
      });
      await nextButton.click();
      if (i < total - 1) {
        const nextIndex = i + 2;
        await expect(
          page.locator(`text=/${nextIndex}\\s*\\/\\s*${total}/`),
        ).toBeVisible({ timeout: 5000 });
      }
    }
    await expect(page).toHaveURL(/\/session\/complete/);

    // 履歴一覧へ
    await page.goto("/history");
    await page.getByRole("link", { name: /詳細を見る/ }).first().click();

    // 履歴詳細画面
    await expect(page).toHaveURL(/\/history\/.+/);

    // 戻るボタンをクリック
    const backButton = page.getByRole("link", {
      name: /履歴一覧に戻る|履歴一覧/,
    });
    await backButton.click();

    // 履歴一覧に戻った
    await expect(page).toHaveURL("/history");
  });
});
