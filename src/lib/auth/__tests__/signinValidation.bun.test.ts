import { describe, expect, it } from "bun:test";

import { AUTH_ERROR_CODES } from "../errorContract";
import { validateSigninBody } from "../signinValidation";

describe("validateSigninBody", () => {
  it("accepts a trimmed email and non-empty password", () => {
    expect(
      validateSigninBody({ email: "  a@example.com  ", password: "secret" }),
    ).toEqual({
      ok: true,
      email: "a@example.com",
      password: "secret",
    });
  });

  it("returns AUTH_VALIDATION when fields are missing or empty", () => {
    expect(validateSigninBody({})).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
    expect(validateSigninBody({ email: "a@example.com", password: "" })).toEqual(
      {
        ok: false,
        code: AUTH_ERROR_CODES.VALIDATION,
      },
    );
    expect(validateSigninBody(null)).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
  });

  it("returns AUTH_INVALID_EMAIL for malformed email", () => {
    expect(
      validateSigninBody({ email: "not-an-email", password: "secret" }),
    ).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.INVALID_EMAIL,
    });
  });
});
