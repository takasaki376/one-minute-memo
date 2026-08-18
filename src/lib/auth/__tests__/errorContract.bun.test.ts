import { describe, expect, it } from "bun:test";

import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
  AUTH_SIGNUP_SUCCESS_MESSAGE,
  authErrorMessage,
  toAuthErrorCode,
} from "../errorContract";
import { AUTH_SESSION_COOKIE } from "../sessionCookie";

describe("toAuthErrorCode", () => {
  it("maps invalid credential family to AUTH_INVALID_CREDENTIAL", () => {
    expect(toAuthErrorCode("auth/invalid-credential")).toBe(
      AUTH_ERROR_CODES.INVALID_CREDENTIAL,
    );
    expect(toAuthErrorCode("auth/user-not-found")).toBe(
      AUTH_ERROR_CODES.INVALID_CREDENTIAL,
    );
    expect(toAuthErrorCode("auth/wrong-password")).toBe(
      AUTH_ERROR_CODES.INVALID_CREDENTIAL,
    );
  });

  it("maps email already in use", () => {
    expect(toAuthErrorCode("auth/email-already-in-use")).toBe(
      AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE,
    );
  });

  it("falls back to AUTH_INTERNAL", () => {
    expect(toAuthErrorCode("auth/unknown")).toBe(AUTH_ERROR_CODES.INTERNAL);
    expect(toAuthErrorCode(undefined)).toBe(AUTH_ERROR_CODES.INTERNAL);
  });
});

describe("authErrorMessage", () => {
  it("keeps existing Japanese copy for invalid credential", () => {
    expect(authErrorMessage(AUTH_ERROR_CODES.INVALID_CREDENTIAL)).toBe(
      "メールアドレスまたはパスワードが正しくありません",
    );
  });

  it("keeps unconfigured copy", () => {
    expect(AUTH_ERROR_MESSAGES.AUTH_NOT_CONFIGURED).toContain("Firebase 未設定");
  });
});

describe("AUTH_SIGNUP_SUCCESS_MESSAGE", () => {
  it("mentions email verification", () => {
    expect(AUTH_SIGNUP_SUCCESS_MESSAGE).toContain("確認メール");
  });
});

describe("AUTH_SESSION_COOKIE", () => {
  it("is httpOnly with a bounded maxAge", () => {
    expect(AUTH_SESSION_COOKIE.name).toBe("__session");
    expect(AUTH_SESSION_COOKIE.httpOnly).toBe(true);
    expect(AUTH_SESSION_COOKIE.sameSite).toBe("lax");
    expect(AUTH_SESSION_COOKIE.maxAgeSeconds).toBeLessThanOrEqual(
      60 * 60 * 24 * 14,
    );
  });
});
