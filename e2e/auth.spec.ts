import { expect, test } from "@playwright/test";

import { installAuthRouteMocks } from "./helpers/auth";
import { resetE2eAppState } from "./helpers/reset";
import { getVisibleSessionTextarea, SESSION_UI_TIMEOUT } from "./helpers/session";

test.describe("認証フロー", () => {
  test.beforeEach(async ({ page }) => {
    await installAuthRouteMocks(page);
    await resetE2eAppState(page);
  });

  test("未ログインでもセッションでメモを入力できる", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /セッションを開始/ }),
    ).toBeVisible();

    await page.goto("/session");
    const textarea = await getVisibleSessionTextarea(page);
    await textarea.fill("未ログインのメモ");
    await expect(textarea).toHaveValue("未ログインのメモ", {
      timeout: SESSION_UI_TIMEOUT,
    });
  });

  test("サインイン後にリロードでセッションが残り、サインアウトで消える", async ({
    page,
  }) => {
    await page.goto("/setting");
    await page.getByTestId("auth-open-login").click();
    await page.getByLabel("メールアドレス").fill("e2e@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByTestId("auth-modal-submit").click();

    await expect(page.getByTestId("header-auth-user")).toHaveText(
      "e2e@example.com",
    );
    await expect(page.getByTestId("auth-sign-out")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("header-auth-user")).toHaveText(
      "e2e@example.com",
      { timeout: SESSION_UI_TIMEOUT },
    );

    await page.getByTestId("auth-sign-out").click();
    await expect(page.getByTestId("auth-open-login")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("auth-open-login")).toBeVisible({
      timeout: SESSION_UI_TIMEOUT,
    });
    await expect(page.getByTestId("header-auth-user")).toHaveCount(0);
  });

  test("サインアップはログインせず確認メッセージを出す", async ({ page }) => {
    await page.goto("/setting");
    await page.getByTestId("auth-open-signup").click();
    await page.getByLabel("メールアドレス").fill("new@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByTestId("auth-modal-submit").click();

    await expect(page.getByText(/確認メールを送信しました/)).toBeVisible();
    await expect(page.getByTestId("header-auth-user")).toHaveCount(0);
    await expect(page.getByTestId("auth-open-login")).toBeVisible();
  });
});
