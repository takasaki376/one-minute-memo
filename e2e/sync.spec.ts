import { expect, test } from "@playwright/test";

import { installAuthRouteMocks } from "./helpers/auth";
import { resetE2eAppState } from "./helpers/reset";

test.describe("同期API経由の設定画面", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthRouteMocks(page);
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              uid: "e2e-user",
              email: "e2e@example.com",
              emailVerified: true,
            },
          },
        }),
      });
    });
    await page.route("**/api/sync/state**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            lastSyncedAt: "2026-03-01T00:00:00.000Z",
            hasRemoteDifference: true,
          },
        }),
      });
    });
    await page.route("**/api/sync/run", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            uploadedMemos: 1,
            downloadedMemos: 0,
            uploadedSessions: 0,
            downloadedSessions: 0,
            uploadedThemes: 0,
            downloadedThemes: 0,
            uploadedThemeSettings: 0,
            downloadedThemeSettings: 0,
            updatedThemeSettings: 0,
            uploadFailures: 0,
            downloadFailures: 0,
            memos: [],
            sessions: [],
            themes: [],
            themeSettings: [],
            deletedThemeSettingIds: [],
            lastSyncedAt: "2026-03-02T00:00:00.000Z",
          },
        }),
      });
    });
    await resetE2eAppState(page);
  });

  test("他端末差分を表示し、同期ボタンが API 経由で完了する", async ({ page }) => {
    await page.goto("/setting");
    await expect(page.getByText("他の端末で同期された可能性があります")).toBeVisible();
    await page.getByTestId("sync-data-button").click();
    await expect(page.getByText("同期が完了しました")).toBeVisible();
    await expect(page.getByText(/アップロード: メモ 1 件/)).toBeVisible();
  });
});
