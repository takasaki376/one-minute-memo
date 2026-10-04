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

const E2E_SESSION_COOKIE = "__session=e2e-session; Path=/; HttpOnly; SameSite=Lax";

function json(
  route: Route,
  status: number,
  body: unknown,
  setCookie?: string,
): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: setCookie ? { "set-cookie": setCookie } : undefined,
    body: JSON.stringify(body),
  });
}

function hasSessionCookie(route: Route): boolean {
  const cookie = route.request().headers().cookie ?? "";
  return cookie.split(";").some((part) => part.trim().startsWith("__session="));
}

/**
 * 認証 API と Identity Toolkit を差し替える。
 * セッションは `__session` Cookie の有無で判定し、サインインで付与、サインアウトで削除する。
 */
export async function installAuthRouteMocks(page: Page): Promise<void> {
  await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
    await json(route, 200, { idToken: "e2e-id-token" });
  });

  await page.route("**/api/auth/session", async (route) => {
    const user = hasSessionCookie(route) ? E2E_SESSION_USER : null;
    await json(route, 200, {
      success: true,
      data: { user },
    });
  });

  await page.route("**/api/auth/signin", async (route) => {
    await json(
      route,
      200,
      {
        success: true,
        data: { user: E2E_SESSION_USER },
      },
      E2E_SESSION_COOKIE,
    );
  });

  await page.route("**/api/auth/signout", async (route) => {
    await json(
      route,
      200,
      {
        success: true,
        data: { user: null },
      },
      "__session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
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
