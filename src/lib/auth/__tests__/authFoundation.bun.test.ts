import { describe, expect, it } from "bun:test";

import { authErrorHttpStatus, toAuthApiError } from "../apiError";
import { buildAuthCookieSetOptions } from "../authCookieOptions";
import { AuthNotConfiguredError } from "../authErrors";
import { AUTH_ERROR_CODES } from "../errorContract";
import { AUTH_SESSION_COOKIE } from "../sessionCookie";
import { decodedIdTokenToSessionUser } from "../sessionUser";

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

  it("does not expose internal error messages", () => {
    const result = toAuthApiError(new Error("secret internal detail"));
    expect(result.error.code).toBe(AUTH_ERROR_CODES.INTERNAL);
    expect(result.error.message).not.toContain("secret internal detail");
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
  it("maps decoded token fields", () => {
    expect(
      decodedIdTokenToSessionUser({
        uid: "uid-1",
        email: "user@example.com",
        email_verified: true,
      }),
    ).toEqual({
      uid: "uid-1",
      email: "user@example.com",
      emailVerified: true,
    });
  });
});
