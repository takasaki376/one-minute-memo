import "server-only";

import type { Auth } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import { AuthNotConfiguredError } from "./authErrors";
import {
  fetchIdTokenWithPassword,
  sendVerifyEmailOobCode,
} from "./identityToolkit";

const ROLLBACK_DELETE_ATTEMPTS = 3;

function rollbackFailedError(uid: string, cause: unknown): Error {
  return Object.assign(
    new Error(
      `Failed to rollback created user ${uid} after signup verification failure`,
    ),
    { code: "auth/internal-error", cause },
  );
}

/**
 * Best-effort cleanup after createUser succeeded but verification email failed.
 * Retries deletes and surfaces failure instead of swallowing it.
 */
export async function rollbackCreatedUser(
  auth: Pick<Auth, "deleteUser">,
  uid: string,
  options?: {
    attempts?: number;
    log?: (message: string, details: Record<string, unknown>) => void;
  },
): Promise<void> {
  const attempts = options?.attempts ?? ROLLBACK_DELETE_ATTEMPTS;
  const log = options?.log ?? ((message, details) => {
    console.error(message, details);
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await auth.deleteUser(uid);
      return;
    } catch (error) {
      lastError = error;
      log("[auth/signup] Failed to delete user during signup rollback", {
        uid,
        attempt,
        attempts,
        error,
      });
    }
  }

  throw rollbackFailedError(uid, lastError);
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
  },
): Promise<{ uid: string }> {
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new AuthNotConfiguredError();
  }

  const user = await auth.createUser({ email, password });

  try {
    await sendSignupVerificationEmail(
      email,
      password,
      options?.fetchImpl ?? fetch,
    );
  } catch (error) {
    try {
      await rollbackCreatedUser(auth, user.uid);
    } catch (rollbackError) {
      console.error(
        "[auth/signup] Signup verification failed and user rollback also failed",
        {
          uid: user.uid,
          verificationError: error,
          rollbackError,
        },
      );
      throw rollbackError;
    }
    throw error;
  }

  return { uid: user.uid };
}
