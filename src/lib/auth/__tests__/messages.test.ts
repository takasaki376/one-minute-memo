import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";

import {
  AUTH_SIGNUP_SUCCESS_MESSAGE,
  toAuthErrorMessage,
} from "../messages";

describe("toAuthErrorMessage", () => {
  it("maps invalid credential to Japanese message", () => {
    const error = new FirebaseError("auth/invalid-credential", "Invalid");
    expect(toAuthErrorMessage(error)).toBe(
      "メールアドレスまたはパスワードが正しくありません",
    );
  });

  it("maps email already in use", () => {
    const error = new FirebaseError("auth/email-already-in-use", "In use");
    expect(toAuthErrorMessage(error)).toBe(
      "このメールアドレスは既に登録されています",
    );
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
