import { describe, expect, it, mock } from "bun:test";

import { AUTH_ERROR_CODES } from "../errorContract";
import { AUTH_SESSION_COOKIE } from "../sessionCookie";
import { handleSigninPost } from "../signinHandler";

describe("handleSigninPost", () => {
  it("returns 400 AUTH_VALIDATION for missing idToken", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        signInWithIdToken: mock(async () => {
          throw new Error("should not be called");
        }),
        setAuthCookie: mock(async () => undefined),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.VALIDATION,
        message: expect.any(String),
      },
    });
  });

  it("sets session cookie and returns SessionUser on success", async () => {
    const setAuthCookie = mock(async () => undefined);
    const signInWithIdToken = mock(async () => ({
      sessionCookie: "session-cookie-1",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        emailVerified: true,
      },
    }));

    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "id-token-1" }),
      }),
      { signInWithIdToken, setAuthCookie },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        user: {
          uid: "uid-1",
          email: "user@example.com",
          emailVerified: true,
        },
      },
    });
    expect(signInWithIdToken).toHaveBeenCalledWith("id-token-1");
    expect(setAuthCookie).toHaveBeenCalledWith("session-cookie-1");
    // Route Handler uses setAuthCookie (httpOnly __session); response body has no Set-Cookie
    // when deps mock cookie writes — contract cookie name for reference:
    expect(AUTH_SESSION_COOKIE.name).toBe("__session");
  });

  it("maps invalid id token to AUTH_INVALID_CREDENTIAL", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "bad-token" }),
      }),
      {
        signInWithIdToken: mock(async () => {
          throw Object.assign(new Error("invalid"), {
            code: "auth/invalid-id-token",
          });
        }),
        setAuthCookie: mock(async () => undefined),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.INVALID_CREDENTIAL,
        message: expect.any(String),
      },
    });
  });

  it("normalizes auth/argument-error during verify to AUTH_INVALID_CREDENTIAL", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "not-a-jwt" }),
      }),
      {
        signInWithIdToken: mock(async () => {
          throw Object.assign(new Error("argument error"), {
            code: "auth/argument-error",
          });
        }),
        setAuthCookie: mock(async () => undefined),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.INVALID_CREDENTIAL,
        message: expect.any(String),
      },
    });
  });
});
