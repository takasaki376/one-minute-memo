import "server-only";

import type { Auth } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import {
  AUTH_DIAGNOSTIC_EVENT,
  annotateAuthFailure,
  buildAuthFailurePayload,
  classifyAdminAuthError,
  createAuthRequestId,
  listMissingFirebaseAdminEnvNames,
  logAuthDiagnostic,
  type AuthDiagnosticSink,
} from "./authDiagnostics";
import { AuthNotConfiguredError } from "./authErrors";
import { AUTH_ERROR_CODES } from "./errorContract";
import {
  fetchIdTokenWithPassword,
  sendVerifyEmailOobCode,
} from "./identityToolkit";

const ROLLBACK_DELETE_ATTEMPTS = 3;

function rollbackFailedError(cause: unknown): Error {
  return Object.assign(
    new Error(
      "Failed to rollback created user after signup verification failure",
    ),
    { code: "auth/internal-error", cause },
  );
}

export type RollbackLogDetails = {
  attempt: number;
  attempts: number;
  requestId: string;
};

/**
 * Best-effort cleanup after createUser succeeded but verification email failed.
 * Retries deletes and surfaces failure instead of swallowing it.
 * Logs each failed attempt without UID or raw exception objects.
 */
export async function rollbackCreatedUser(
  auth: Pick<Auth, "deleteUser">,
  uid: string,
  options?: {
    attempts?: number;
    requestId?: string;
    log?: (details: RollbackLogDetails) => void;
    sink?: AuthDiagnosticSink;
  },
): Promise<void> {
  const attempts = options?.attempts ?? ROLLBACK_DELETE_ATTEMPTS;
  const requestId = options?.requestId ?? createAuthRequestId();
  const log =
    options?.log ??
    ((details: RollbackLogDetails) => {
      logAuthDiagnostic(
        buildAuthFailurePayload({
          event: AUTH_DIAGNOSTIC_EVENT.ROLLBACK_FAILURE,
          error: annotateAuthFailure(new Error("rollback_delete_failed"), {
            stage: "admin.rollback_delete_user",
            requestId: details.requestId,
            diagnosticClass: "admin.rollback_delete_failed",
            attempt: details.attempt,
            attempts: details.attempts,
          }),
          requestId: details.requestId,
          route: "/api/auth/signup",
          httpStatus: 500,
          publicErrorCode: AUTH_ERROR_CODES.INTERNAL,
          stage: "admin.rollback_delete_user",
          attempt: details.attempt,
          attempts: details.attempts,
        }),
        options?.sink,
      );
    });

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await auth.deleteUser(uid);
      return;
    } catch (error) {
      lastError = error;
      log({ attempt, attempts, requestId });
    }
  }

  throw annotateAuthFailure(rollbackFailedError(lastError), {
    stage: "admin.rollback_delete_user",
    requestId,
    diagnosticClass: classifyAdminAuthError(lastError),
    attempt: attempts,
    attempts,
  });
}

/**
 * Admin SDK has no sendEmailVerification. After createUser, exchange
 * credentials via Identity Toolkit REST and request VERIFY_EMAIL oob.
 */
export async function sendSignupVerificationEmail(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const idToken = await fetchIdTokenWithPassword(email, password, fetchImpl);
  await sendVerifyEmailOobCode(idToken, fetchImpl);
}

export async function createAuthUser(
  email: string,
  password: string,
  options?: {
    fetchImpl?: typeof fetch;
    requestId?: string;
    sink?: AuthDiagnosticSink;
  },
): Promise<{ uid: string }> {
  const requestId = options?.requestId ?? createAuthRequestId();

  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (error) {
    throw annotateAuthFailure(error, {
      stage: "admin.initialize",
      requestId,
      diagnosticClass: classifyAdminAuthError(error),
    });
  }

  if (!auth) {
    throw annotateAuthFailure(new AuthNotConfiguredError(), {
      stage: "admin.initialize",
      requestId,
      diagnosticClass: "config.missing_env",
      missingEnvNames: listMissingFirebaseAdminEnvNames(),
    });
  }

  let user: { uid: string };
  try {
    user = await auth.createUser({ email, password });
  } catch (error) {
    throw annotateAuthFailure(error, {
      stage: "admin.create_user",
      requestId,
      diagnosticClass: classifyAdminAuthError(error),
    });
  }

  try {
    await sendSignupVerificationEmail(
      email,
      password,
      options?.fetchImpl ?? fetch,
    );
  } catch (error) {
    try {
      await rollbackCreatedUser(auth, user.uid, {
        requestId,
        sink: options?.sink,
      });
    } catch (rollbackError) {
      // Per-attempt rollback failures already logged; rethrow annotated error once.
      throw rollbackError;
    }
    throw annotateAuthFailure(error, { requestId, stage: "unknown" });
  }

  return { uid: user.uid };
}
