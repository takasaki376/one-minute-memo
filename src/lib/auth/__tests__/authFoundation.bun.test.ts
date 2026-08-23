import { describe, expect, it } from "bun:test";

import { authErrorHttpStatus, toAuthApiError } from "../apiError";
import { buildAuthCookieSetOptions } from "../authCookies";
import { AUTH_ERROR_CODES } from "../errorContract";
import { AUTH_SESSION_COOKIE } from "../sessionCookie";
import { AuthNotConfiguredError } from "../sessionToken";

describe("buildAuthCookieSetOptions", () => {
  it("matches AUTH_SESSION_COOKIE contract", () => {
    const options = buildAuthCookieSetOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe(AUTH_SESSION_COOKIE.sameSite);
    expect(options.path).toBe(AUTH_SESSION_COOKIE.path);
    expect(options.maxAge).toBe(AUTH_SESSION_COOKIE.maxAgeSeconds);
  });
});

describe("toAuthApiError", () => {
  it("maps AuthNotConfiguredError to AUTH_NOT_CONFIGURED", () => {
    const result = toAuthApiError(new AuthNotConfiguredError());
    expect(result).toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.NOT_CONFIGURED,
        message: expect.stringContaining("Firebase"),
      },
    });
  });

  it("maps firebase admin auth codes", () => {
    const result = toAuthApiError({ code: "auth/invalid-session-cookie" });
    expect(result.error.code).toBe(AUTH_ERROR_CODES.UNAUTHENTICATED);
  });
});

describe("authErrorHttpStatus", () => {
  it("returns 401 for unauthenticated", () => {
    expect(authErrorHttpStatus(AUTH_ERROR_CODES.UNAUTHENTICATED)).toBe(401);
  });

  it("returns 500 for not configured", () => {
    expect(authErrorHttpStatus(AUTH_ERROR_CODES.NOT_CONFIGURED)).toBe(500);
  });
});

describe("decodedIdTokenToSessionUser", () => {
  it("maps decoded token fields", async () => {
    const { decodedIdTokenToSessionUser } = await import("../sessionToken");
    expect(
      decodedIdTokenToSessionUser({
        uid: "uid-1",
        email: "user@example.com",
        email_verified: true,
      } as Parameters<typeof decodedIdTokenToSessionUser>[0]),
    ).toEqual({
      uid: "uid-1",
      email: "user@example.com",
      emailVerified: true,
    });
  });
});
