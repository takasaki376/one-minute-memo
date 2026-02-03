import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb";
import { getThemeTotal } from "./helpers/session";

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
      page.getByRole("link", { name: /セッションを開始/ }),
    ).toBeVisible();
  });

  test("トップからセッション画面に遷移できる", async ({ page }) => {
    await page.goto("/");

    // セッション開始ボタンをクリック（トップページのボタンのみを対象）
    await page.getByRole("link", { name: /セッションを開始/ }).click();

    // セッション画面に遷移
    await expect(page).toHaveURL(/\/session/);

    // テーマ表示があることを確認（1/N のインジケータ、N は設定で可変）
    await expect(page.locator("text=/1\\s*\\/\\s*\\d+/")).toBeVisible();
  });

  test("セッション画面でタイマーが表示される", async ({ page }) => {
    await page.goto("/session");

    // タイマー表示を確認（「残り時間」「秒」に挟まれた秒数表示）
    await expect(page.getByText(/残り時間\s*\d+\s*秒/)).toBeVisible();
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
    const total = await getThemeTotal(page);

    // 全テーマ分「次へ」をクリック（各クリック後にインジケータ更新を待つ）
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

    // 完了画面に遷移
    await expect(page).toHaveURL(/\/session\/complete/);

    // 完了メッセージを確認（見出しとして表示されている）
    await expect(
      page.getByRole("heading", { name: /完了|おつかれさま/ }),
    ).toBeVisible();
  });
});
