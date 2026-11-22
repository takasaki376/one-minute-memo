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
      isAuthConfigured: () => true,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { user: null, configured: true },
    });
  });

  it("returns configured false when auth env is incomplete", async () => {
    const response = await handleSessionGet({
      getAuthCookie: mock(async () => undefined),
      verifySessionCookie: mock(async () => {
        throw new Error("should not be called");
      }),
      clearAuthCookie: mock(async () => undefined),
      isAuthConfigured: () => false,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { user: null, configured: false },
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
      isAuthConfigured: () => false,
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
        configured: true,
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
      isAuthConfigured: () => true,
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
    const logged: string[] = [];
    const originalError = console.error;
    console.error = ((...args: unknown[]) => {
      logged.push(String(args[0] ?? ""));
    }) as typeof console.error;
    try {
      const response = await handleSessionGet({
        getAuthCookie: mock(async () => "any-session"),
        verifySessionCookie: mock(async () => {
          throw new AuthNotConfiguredError();
        }),
        clearAuthCookie: mock(async () => undefined),
        isAuthConfigured: () => false,
      });

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: {
          code: AUTH_ERROR_CODES.NOT_CONFIGURED,
          message: expect.any(String),
        },
      });
      expect(logged.length).toBeGreaterThan(0);
      expect(logged[0]?.includes("AUTH_NOT_CONFIGURED")).toBe(true);
      expect(logged[0]?.includes("any-session")).toBe(false);
    } finally {
      console.error = originalError;
    }
  });
});
