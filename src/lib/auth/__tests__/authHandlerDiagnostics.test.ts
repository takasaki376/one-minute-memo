import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { AUTH_ERROR_CODES } from "../errorContract";
import { handleSigninPost } from "../signinHandler";
import { handleSignupPost } from "../signupHandler";
import { handleSessionGet } from "../sessionHandler";
import { AuthNotConfiguredError } from "../authErrors";

describe("auth handler diagnostics", () => {
  const errorCalls: unknown[][] = [];

  beforeEach(() => {
    errorCalls.length = 0;
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errorCalls.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function parseLoggedJson(): Record<string, unknown> {
    expect(errorCalls.length).toBeGreaterThan(0);
    const line = errorCalls[0]?.[0];
    expect(typeof line).toBe("string");
    return JSON.parse(line as string) as Record<string, unknown>;
  }

  it("logs 500 AUTH_INTERNAL for signin with stage and without secrets", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "hunter2-secret",
        }),
      }),
      {
        signInWithPassword: vi.fn(async () => {
          const error = Object.assign(
            new Error("API_KEY_INVALID key=SHOULD_NOT_LOG"),
            { code: "auth/internal-error" },
          );
          const { annotateAuthFailure } = await import("../authDiagnostics");
          throw annotateAuthFailure(error, {
            stage: "identity_toolkit.signin",
            diagnosticClass: "identity_toolkit.api_key_invalid",
            identityToolkitHttpStatus: 400,
          });
        }),
        setAuthCookie: vi.fn(async () => undefined),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.INTERNAL,
        message: expect.any(String),
      },
    });

    const logged = parseLoggedJson();
    expect(logged).toMatchObject({
      event: "auth.failure",
      route: "/api/auth/signin",
      stage: "identity_toolkit.signin",
      httpStatus: 500,
      publicErrorCode: AUTH_ERROR_CODES.INTERNAL,
      diagnosticClass: "identity_toolkit.api_key_invalid",
    });
    expect(JSON.stringify(logged)).not.toContain("hunter2");
    expect(JSON.stringify(logged)).not.toContain("SHOULD_NOT_LOG");
    expect(JSON.stringify(logged)).not.toContain("user@example.com");
  });

  it("does not log 401 invalid credentials on signin", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "bad",
        }),
      }),
      {
        signInWithPassword: vi.fn(async () => {
          throw Object.assign(new Error("invalid"), {
            code: "auth/invalid-credential",
          });
        }),
        setAuthCookie: vi.fn(async () => undefined),
      },
    );

    expect(response.status).toBe(401);
    expect(errorCalls).toHaveLength(0);
  });

  it("correlates signin fault logs to a single handler requestId", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      }),
      {
        signInWithPassword: vi.fn(async () => {
          throw Object.assign(new Error("boom"), {
            code: "auth/internal-error",
          });
        }),
        setAuthCookie: vi.fn(async () => undefined),
      },
    );

    expect(response.status).toBe(500);
    const logged = parseLoggedJson();
    expect(typeof logged.requestId).toBe("string");
    expect(String(logged.requestId).length).toBeGreaterThan(0);
    expect(logged.stage).toBe("unknown");
  });

  it("logs cookie.set failures on signin", async () => {
    const response = await handleSigninPost(
      new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      }),
      {
        signInWithPassword: vi.fn(async () => ({
          sessionCookie: "session-cookie",
          user: {
            uid: "uid-1",
            email: "user@example.com",
            emailVerified: true,
          },
        })),
        setAuthCookie: vi.fn(async () => {
          throw new Error("cookie write failed");
        }),
      },
    );

    expect(response.status).toBe(500);
    const logged = parseLoggedJson();
    expect(logged.stage).toBe("cookie.set");
    expect(logged.publicErrorCode).toBe(AUTH_ERROR_CODES.INTERNAL);
  });

  it("logs signup 500 once and keeps public AUTH_INTERNAL message", async () => {
    const response = await handleSignupPost(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
        }),
      }),
      {
        createAuthUser: vi.fn(async () => {
          throw Object.assign(new Error("boom"), {
            code: "auth/internal-error",
          });
        }),
      },
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: AUTH_ERROR_CODES.INTERNAL,
        message: "認証処理に失敗しました",
      },
    });
    expect(errorCalls).toHaveLength(1);
    expect(parseLoggedJson().route).toBe("/api/auth/signup");
  });

  it("logs session AUTH_NOT_CONFIGURED as 500 fault", async () => {
    const response = await handleSessionGet({
      getAuthCookie: vi.fn(async () => "any-session"),
      verifySessionCookie: vi.fn(async () => {
        throw new AuthNotConfiguredError();
      }),
      clearAuthCookie: vi.fn(async () => undefined),
      isAuthConfigured: () => false,
    });

    expect(response.status).toBe(500);
    const logged = parseLoggedJson();
    expect(logged.publicErrorCode).toBe(AUTH_ERROR_CODES.NOT_CONFIGURED);
    expect(logged.httpStatus).toBe(500);
  });

  it("does not log session 401 unauthenticated", async () => {
    const response = await handleSessionGet({
      getAuthCookie: vi.fn(async () => "stale"),
      verifySessionCookie: vi.fn(async () => {
        throw Object.assign(new Error("expired"), {
          code: "auth/session-cookie-expired",
        });
      }),
      clearAuthCookie: vi.fn(async () => undefined),
      isAuthConfigured: () => true,
    });

    expect(response.status).toBe(401);
    expect(errorCalls).toHaveLength(0);
  });
});
