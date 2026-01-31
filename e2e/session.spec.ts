import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb";

test.describe("セッション実行フロー", () => {
  test.beforeEach(async ({ page }) => {
    // IndexedDB をクリアしてクリーンな状態から開始
    await page.goto("/");
    await clearIndexedDB(page);
    await page.reload();
  });

  test("トップ画面が表示される", async ({ page }) => {
    await page.goto("/");

    // タイトルが表示される
    await expect(page.locator("h1")).toBeVisible();

    // セッション開始ボタンが表示される
    await expect(
      page.getByRole("link", { name: /セッションを始める|セッション/ })
    ).toBeVisible();
  });

  test("トップからセッション画面に遷移できる", async ({ page }) => {
    await page.goto("/");

    // セッション開始ボタンをクリック
    await page.getByRole("link", { name: /セッションを始める|セッション/ }).click();

    // セッション画面に遷移
    await expect(page).toHaveURL(/\/session/);

    // テーマ表示があることを確認
    await expect(page.locator("text=/テーマ|Theme/i")).toBeVisible();
  });

  test("セッション画面でタイマーが表示される", async ({ page }) => {
    await page.goto("/session");

    // タイマー表示を確認（秒数表示）
    await expect(page.locator("text=/\\d+/")).toBeVisible();
  });

  test("セッション画面でテキスト入力ができる", async ({ page }) => {
    await page.goto("/session");

    // テキストエリアを探す
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    // テキストを入力
    await textarea.fill("テスト入力テキスト");

    // 入力値を確認
    await expect(textarea).toHaveValue("テスト入力テキスト");
  });

  test("「次へ」ボタンで次のテーマに進める", async ({ page }) => {
    await page.goto("/session");

    // 最初のテーマ（1/10 など）を確認
    const themeIndicator = page.locator("text=/1.*\\/|テーマ.*1/");
    await expect(themeIndicator).toBeVisible();

    // 次へボタンをクリック
    const nextButton = page.getByRole("button", {
      name: /次へ|終了して次へ|このテーマを終了/,
    });
    await nextButton.click();

    // 次のテーマ（2/10 など）に進んだことを確認
    await expect(page.locator("text=/2.*\\/|テーマ.*2/")).toBeVisible();
  });

  test("10テーマ完了後、完了画面に遷移する", async ({ page }) => {
    await page.goto("/session");

    // 10回「次へ」ボタンをクリックして全テーマを完了
    for (let i = 0; i < 10; i++) {
      const nextButton = page.getByRole("button", {
        name: /次へ|終了して次へ|このテーマを終了/,
      });
      await nextButton.click();

      // 最後のテーマ以外は少し待機
      if (i < 9) {
        await page.waitForTimeout(100);
      }
    }

    // 完了画面に遷移
    await expect(page).toHaveURL(/\/session\/complete/);

    // 完了メッセージを確認
    await expect(page.locator("text=/完了|おつかれさま/")).toBeVisible();
  });
});
