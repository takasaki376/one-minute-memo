import { describe, expect, it } from "bun:test";

import { AuthApiError } from "../clientApi";
import { AUTH_ERROR_CODES } from "../errorContract";
import {
  AUTH_SIGNUP_SUCCESS_MESSAGE,
  toAuthErrorMessage,
} from "../messages";

describe("toAuthErrorMessage", () => {
  it("maps invalid credential to Japanese message", () => {
    const error = Object.assign(new Error("Invalid"), {
      code: "auth/invalid-credential",
    });
    expect(toAuthErrorMessage(error)).toBe(
      "メールアドレスまたはパスワードが正しくありません",
    );
  });

  it("maps email already in use", () => {
    const error = Object.assign(new Error("In use"), {
      code: "auth/email-already-in-use",
    });
    expect(toAuthErrorMessage(error)).toBe(
      "このメールアドレスは既に登録されています",
    );
  });

  it("maps AuthApiError message from API", () => {
    expect(
      toAuthErrorMessage(
        new AuthApiError(
          AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE,
          "このメールアドレスは既に登録されています",
        ),
      ),
    ).toBe("このメールアドレスは既に登録されています");
  });

  it("handles unconfigured firebase error", () => {
    expect(toAuthErrorMessage(new Error("Firebase is not configured"))).toBe(
      "認証機能は現在利用できません（Firebase 未設定）",
    );
  });
});

describe("AUTH_SIGNUP_SUCCESS_MESSAGE", () => {
  it("mentions email verification", () => {
    expect(AUTH_SIGNUP_SUCCESS_MESSAGE).toContain("確認メール");
  });
});
