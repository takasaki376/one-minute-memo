import { test, expect } from "@playwright/test";
import { resetE2eAppState } from "./helpers/reset";
import { SESSION_UI_TIMEOUT } from "./helpers/session";

test.describe("テーマ管理フロー", () => {
  test.beforeEach(async ({ page }) => {
    await resetE2eAppState(page);
  });

  test("テーマ管理画面にアクセスできる", async ({ page }) => {
    await page.goto("/themes");

    await expect(page.getByRole("heading", { name: "テーマ管理" })).toBeVisible({
      timeout: SESSION_UI_TIMEOUT,
    });
  });

  test("CSV一括登録パネルとサンプルダウンロードが表示される", async ({ page }) => {
    await page.goto("/themes");

    await expect(page.getByText("CSV一括登録")).toBeVisible({
      timeout: SESSION_UI_TIMEOUT,
    });
    await expect(page.getByTestId("themes-csv-sample-download")).toBeVisible();
    await expect(page.getByTestId("themes-csv-import-open")).toBeVisible();
  });

  test("テーマを追加できる", async ({ page }) => {
    await page.goto("/themes");

    await page.getByTestId("themes-add-open").click();
    const dialog = page.getByRole("dialog", { name: "テーマを追加" });
    await expect(dialog).toBeVisible({ timeout: SESSION_UI_TIMEOUT });

    await dialog.getByLabelText(/テーマ名/).fill("E2E追加テーマ");
    await dialog.getByLabelText("新規カテゴリ").fill("e2e-smoke");
    await dialog.getByRole("button", { name: "追加" }).click();

    await expect(page.getByText("E2E追加テーマ")).toBeVisible({
      timeout: SESSION_UI_TIMEOUT,
    });
  });
});
