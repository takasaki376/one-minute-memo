import { describe, expect, it, mock } from "bun:test";

import { AuthNotConfiguredError } from "../authErrors";
import { AUTH_ERROR_CODES } from "../errorContract";
import { handleSessionGet } from "../sessionHandler";

describe("handleSessionGet", () => {
  it("returns 200 user null when cookie is missing", async () => {
    const response = await handleSessionGet({
      getAuthCookie: mock(async () => undefined),
      verifySessionCookie: mock(async () => {
        throw new Error("should not be called");
      }),
      clearAuthCookie: mock(async () => undefined),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { user: null },
    });
  });

  it("returns 200 SessionUser when cookie is valid", async () => {
    const verifySessionCookie = mock(async () => ({
      uid: "uid-1",
      email: "user@example.com",
      email_verified: true,
    }));

    const response = await handleSessionGet({
      getAuthCookie: mock(async () => "valid-session"),
      verifySessionCookie,
      clearAuthCookie: mock(async () => undefined),
    });

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
    expect(verifySessionCookie).toHaveBeenCalledWith("valid-session");
  });

  it("returns 401 AUTH_UNAUTHENTICATED and clears cookie when invalid", async () => {
    const clearAuthCookie = mock(async () => undefined);

    const response = await handleSessionGet({
      getAuthCookie: mock(async () => "stale-session"),
      verifySessionCookie: mock(async () => {
        throw Object.assign(new Error("expired"), {
          code: "auth/session-cookie-expired",
        });
      }),
      clearAuthCookie,
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.UNAUTHENTICATED,
        message: expect.any(String),
      },
    });
    expect(clearAuthCookie).toHaveBeenCalled();
  });

  it("returns 500 AUTH_NOT_CONFIGURED when Admin is missing and cookie exists", async () => {
    const response = await handleSessionGet({
      getAuthCookie: mock(async () => "any-session"),
      verifySessionCookie: mock(async () => {
        throw new AuthNotConfiguredError();
      }),
      clearAuthCookie: mock(async () => undefined),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.NOT_CONFIGURED,
        message: expect.any(String),
      },
    });
  });
});
