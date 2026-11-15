import { describe, expect, it, vi } from "vitest";

import {
  AUTH_DIAGNOSTIC_EVENT,
  annotateAuthFailure,
  buildAuthFailurePayload,
  classifyAdminAuthError,
  classifyIdentityToolkitMessage,
  createAuthRequestId,
  extractErrorCode,
  extractErrorName,
  getAuthFailureMeta,
  listMissingFirebaseAdminEnvNames,
  logAuthDiagnostic,
  logAuthHandlerFault,
} from "../authDiagnostics";
import { AuthNotConfiguredError } from "../authErrors";

describe("authDiagnostics", () => {
  it("createAuthRequestId returns a non-empty string", () => {
    expect(createAuthRequestId(() => "fixed-id")).toBe("fixed-id");
    expect(createAuthRequestId().length).toBeGreaterThan(0);
  });

  it("annotateAuthFailure preserves AuthNotConfiguredError and Firebase code", () => {
    const notConfigured = new AuthNotConfiguredError();
    const annotated = annotateAuthFailure(notConfigured, {
      stage: "admin.initialize",
      diagnosticClass: "config.missing_env",
      missingEnvNames: ["FIREBASE_ADMIN_PROJECT_ID"],
    });

    expect(annotated).toBe(notConfigured);
    expect(annotated).toBeInstanceOf(AuthNotConfiguredError);
    expect(getAuthFailureMeta(annotated)?.stage).toBe("admin.initialize");

    const firebaseError = Object.assign(new Error("secret message"), {
      code: "auth/invalid-credential",
    });
    annotateAuthFailure(firebaseError, {
      stage: "identity_toolkit.signin",
      diagnosticClass: "identity_toolkit.invalid_credentials",
    });
    expect(firebaseError.code).toBe("auth/invalid-credential");
    expect(getAuthFailureMeta(firebaseError)?.stage).toBe(
      "identity_toolkit.signin",
    );
  });

  it("annotates frozen and non-extensible errors via WeakMap", () => {
    const frozen = Object.freeze(
      Object.assign(new Error("frozen"), { code: "auth/internal-error" }),
    );
    const annotatedFrozen = annotateAuthFailure(frozen, {
      stage: "admin.create_user",
      diagnosticClass: "admin.unknown",
      requestId: "req-frozen",
    });
    expect(annotatedFrozen).toBe(frozen);
    expect(getAuthFailureMeta(frozen)).toMatchObject({
      stage: "admin.create_user",
      requestId: "req-frozen",
    });

    const sealed = Object.seal(new Error("sealed"));
    const annotatedSealed = annotateAuthFailure(sealed, {
      stage: "cookie.set",
    });
    expect(annotatedSealed).toBe(sealed);
    expect(getAuthFailureMeta(sealed)?.stage).toBe("cookie.set");
  });

  it("keeps innermost stage when re-annotated", () => {
    const error = new Error("x");
    annotateAuthFailure(error, { stage: "identity_toolkit.signin" });
    annotateAuthFailure(error, {
      stage: "unknown",
      requestId: "req-1",
    });
    expect(getAuthFailureMeta(error)).toMatchObject({
      stage: "identity_toolkit.signin",
      requestId: "req-1",
    });
  });

  it("classifies Identity Toolkit and Admin failures without needing raw logs", () => {
    expect(classifyIdentityToolkitMessage("API_KEY_INVALID")).toBe(
      "identity_toolkit.api_key_invalid",
    );
    expect(
      classifyIdentityToolkitMessage("API_KEY_HTTP_REFERRER_BLOCKED"),
    ).toBe("identity_toolkit.api_key_restricted");
    expect(classifyIdentityToolkitMessage("OPERATION_NOT_ALLOWED")).toBe(
      "identity_toolkit.operation_not_allowed",
    );
    expect(classifyIdentityToolkitMessage("INVALID_PASSWORD")).toBe(
      "identity_toolkit.invalid_credentials",
    );

    expect(
      classifyAdminAuthError(
        Object.assign(new Error("Failed to parse private key PEM"), {
          code: "app/invalid-credential",
        }),
      ),
    ).toBe("admin.credential_invalid");
    expect(
      classifyAdminAuthError(
        new Error("Cannot find module 'jose'\nERR_REQUIRE_ESM"),
      ),
    ).toBe("admin.runtime_dependency");
  });

  it("listMissingFirebaseAdminEnvNames reports names only", () => {
    expect(
      listMissingFirebaseAdminEnvNames({
        FIREBASE_ADMIN_PROJECT_ID: "p",
        FIREBASE_ADMIN_CLIENT_EMAIL: "",
        FIREBASE_ADMIN_PRIVATE_KEY: "k",
      }),
    ).toEqual(["FIREBASE_ADMIN_CLIENT_EMAIL"]);
  });

  it("only allowlists known errorName / errorCode values", () => {
    expect(
      extractErrorCode(
        Object.assign(new Error("x"), { code: "auth/internal-error" }),
      ),
    ).toBe("auth/internal-error");
    expect(
      extractErrorCode(
        Object.assign(new Error("x"), {
          code: "user@example.com/token-abc",
        }),
      ),
    ).toBeUndefined();
    expect(
      extractErrorName(
        Object.assign(new Error("x"), { name: "AuthNotConfiguredError" }),
      ),
    ).toBe("AuthNotConfiguredError");
    expect(
      extractErrorName(
        Object.assign(new Error("x"), {
          name: "user@example.com",
        }),
      ),
    ).toBeUndefined();
  });

  it("logAuthDiagnostic emits allowlisted JSON without stack or secrets", () => {
    const sink = vi.fn();
    const error = annotateAuthFailure(
      Object.assign(new Error("password=super-secret&token=abc"), {
        code: "auth/internal-error",
        name: "Error",
        stack: [
          "Error: password=super-secret",
          "    at run (/Users/me/src/lib/auth/signin.ts:10:5)",
          "    at Object.<anonymous> (/Users/me/node_modules/foo/index.js:1:1)",
        ].join("\n"),
      }),
      {
        stage: "identity_toolkit.signin",
        diagnosticClass: "identity_toolkit.api_key_invalid",
        identityToolkitHttpStatus: 400,
      },
    );

    logAuthDiagnostic(
      buildAuthFailurePayload({
        error,
        requestId: "req-abc",
        route: "/api/auth/signin",
        httpStatus: 500,
        publicErrorCode: "AUTH_INTERNAL",
      }),
      sink,
    );

    expect(sink).toHaveBeenCalledTimes(1);
    const line = sink.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(line) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      event: AUTH_DIAGNOSTIC_EVENT.FAILURE,
      requestId: "req-abc",
      route: "/api/auth/signin",
      stage: "identity_toolkit.signin",
      httpStatus: 500,
      publicErrorCode: "AUTH_INTERNAL",
      errorCode: "auth/internal-error",
      errorName: "Error",
      diagnosticClass: "identity_toolkit.api_key_invalid",
      identityToolkitHttpStatus: 400,
    });
    expect(parsed).not.toHaveProperty("stackFrames");
    expect(line).not.toContain("super-secret");
    expect(line).not.toContain("password=");
    expect(line).not.toContain("signin.ts");
  });

  it("logAuthHandlerFault skips non-500 statuses", () => {
    const sink = vi.fn();
    logAuthHandlerFault({
      error: new Error("bad password"),
      requestId: "r1",
      route: "/api/auth/signin",
      httpStatus: 401,
      publicErrorCode: "AUTH_INVALID_CREDENTIAL",
      sink,
    });
    expect(sink).not.toHaveBeenCalled();
  });

  it("logAuthHandlerFault tolerates throwing getters during payload build", () => {
    const sink = vi.fn();
    const hostile = {};
    Object.defineProperty(hostile, "name", {
      enumerable: true,
      get() {
        throw new Error("getter boom");
      },
    });
    Object.defineProperty(hostile, "code", {
      enumerable: true,
      get() {
        throw new Error("code boom");
      },
    });

    expect(() =>
      logAuthHandlerFault({
        error: hostile,
        requestId: "r-hostile",
        route: "/api/auth/signin",
        httpStatus: 500,
        publicErrorCode: "AUTH_INTERNAL",
        sink,
      }),
    ).not.toThrow();
    expect(sink).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(sink.mock.calls[0]?.[0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.publicErrorCode).toBe("AUTH_INTERNAL");
    expect(parsed.requestId).toBe("r-hostile");
  });

  it("logger failure does not throw", () => {
    expect(() =>
      logAuthDiagnostic(
        buildAuthFailurePayload({
          error: new Error("x"),
          requestId: "r",
          route: "/api/auth/signin",
          httpStatus: 500,
          publicErrorCode: "AUTH_INTERNAL",
        }),
        () => {
          throw new Error("sink down");
        },
      ),
    ).not.toThrow();
  });

  it("handles circular and non-Error throws when building payload", () => {
    const circular: Record<string, unknown> = { code: "auth/internal-error" };
    circular.self = circular;
    annotateAuthFailure(circular, {
      stage: "admin.create_user",
      diagnosticClass: "admin.unknown",
    });

    const sink = vi.fn();
    logAuthDiagnostic(
      buildAuthFailurePayload({
        error: circular,
        requestId: "r2",
        route: "/api/auth/signup",
        httpStatus: 500,
        publicErrorCode: "AUTH_INTERNAL",
      }),
      sink,
    );
    expect(sink).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sink.mock.calls[0]?.[0] as string).errorCode).toBe(
      "auth/internal-error",
    );

    logAuthDiagnostic(
      buildAuthFailurePayload({
        error: "string-throw",
        requestId: "r3",
        route: "/api/auth/signup",
        httpStatus: 500,
        publicErrorCode: "AUTH_INTERNAL",
      }),
      sink,
    );
    expect(sink).toHaveBeenCalledTimes(2);
  });
});
