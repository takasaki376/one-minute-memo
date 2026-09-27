import type { Page, Route } from "@playwright/test";

export type E2eSessionUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
};

export const E2E_SESSION_USER: E2eSessionUser = {
  uid: "e2e-user",
  email: "e2e@example.com",
  emailVerified: true,
};

type AuthRouteState = {
  user: E2eSessionUser | null;
};

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * 認証 API と Identity Toolkit を差し替える。
 * Firebase Admin や実ユーザーがなくても signup/signin/signout/session を検証する。
 */
export async function installAuthRouteMocks(
  page: Page,
  state: AuthRouteState,
): Promise<void> {
  await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
    await json(route, 200, { idToken: "e2e-id-token" });
  });

  await page.route("**/api/auth/session", async (route) => {
    await json(route, 200, {
      success: true,
      data: { user: state.user },
    });
  });

  await page.route("**/api/auth/signin", async (route) => {
    state.user = E2E_SESSION_USER;
    await json(route, 200, {
      success: true,
      data: { user: E2E_SESSION_USER },
    });
  });

  await page.route("**/api/auth/signout", async (route) => {
    state.user = null;
    await json(route, 200, {
      success: true,
      data: { user: null },
    });
  });

  await page.route("**/api/auth/signup", async (route) => {
    await json(route, 200, {
      success: true,
      data: {
        user: null,
        message:
          "アカウントを作成しました。確認メールを送信しました。メール内のリンクから認証を完了してください。",
      },
    });
  });
}
