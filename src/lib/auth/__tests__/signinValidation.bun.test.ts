import { describe, expect, it } from "bun:test";

import { AUTH_ERROR_CODES } from "../errorContract";
import { validateSigninBody } from "../signinValidation";

describe("validateSigninBody", () => {
  it("accepts a non-empty trimmed idToken", () => {
    expect(validateSigninBody({ idToken: "  token-1  " })).toEqual({
      ok: true,
      idToken: "token-1",
    });
  });

  it("returns AUTH_VALIDATION when idToken is missing or empty", () => {
    expect(validateSigninBody({})).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
    expect(validateSigninBody({ idToken: "   " })).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
    expect(validateSigninBody(null)).toEqual({
      ok: false,
      code: AUTH_ERROR_CODES.VALIDATION,
    });
  });
});
