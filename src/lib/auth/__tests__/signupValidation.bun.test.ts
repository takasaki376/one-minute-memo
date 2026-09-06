import { describe, expect, it } from "bun:test";

import { AUTH_ERROR_CODES } from "../errorContract";
import { validateSignupBody } from "../signupValidation";

describe("validateSignupBody", () => {
  it("accepts a trimmed email and password of at least 6 chars", () => {
    expect(
      validateSignupBody({
        email: "  user@example.com ",
        password: "secret1",
      }),
    ).toEqual({
      ok: true,
      email: "user@example.com",
      password: "secret1",
    });
  });

  it("returns AUTH_VALIDATION when fields are missing", () => {
    expect(validateSignupBody({})).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
    expect(validateSignupBody({ email: "user@example.com" })).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
    expect(validateSignupBody(null)).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
  });

  it("returns AUTH_INVALID_EMAIL for malformed email", () => {
    expect(
      validateSignupBody({ email: "not-an-email", password: "secret1" }),
    ).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.INVALID_EMAIL,
    });
  });

  it("returns AUTH_WEAK_PASSWORD when password is too short", () => {
    expect(
      validateSignupBody({ email: "user@example.com", password: "12345" }),
    ).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.WEAK_PASSWORD,
    });
  });
});
