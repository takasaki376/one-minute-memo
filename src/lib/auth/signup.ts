import "server-only";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

import { AuthNotConfiguredError } from "./authErrors";

type IdentityToolkitErrorBody = {
  error?: {
    message?: string;
    errors?: Array<{ message?: string }>;
  };
};

function identityToolkitError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

async function readIdentityToolkitError(
  response: Response,
): Promise<{ code: string; message: string }> {
  let body: IdentityToolkitErrorBody = {};
  try {
    body = (await response.json()) as IdentityToolkitErrorBody;
  } catch {
    // ignore JSON parse errors
  }

  const message =
    body.error?.message ??
    body.error?.errors?.[0]?.message ??
    `Identity Toolkit request failed (${response.status})`;

  const normalized = message.toUpperCase();
  if (normalized.includes("EMAIL_EXISTS")) {
    return { code: "auth/email-already-in-use", message };
  }
  if (normalized.includes("INVALID_EMAIL")) {
    return { code: "auth/invalid-email", message };
  }
  if (normalized.includes("WEAK_PASSWORD")) {
    return { code: "auth/weak-password", message };
  }
  if (normalized.includes("TOO_MANY_ATTEMPTS")) {
    return { code: "auth/too-many-requests", message };
  }
  if (normalized.includes("USER_DISABLED")) {
    return { code: "auth/user-disabled", message };
  }

  return { code: "auth/internal-error", message };
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
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new AuthNotConfiguredError();
  }

  const signInResponse = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  if (!signInResponse.ok) {
    const mapped = await readIdentityToolkitError(signInResponse);
    throw identityToolkitError(mapped.code, mapped.message);
  }

  const signInJson = (await signInResponse.json()) as { idToken?: string };
  if (!signInJson.idToken) {
    throw identityToolkitError(
      "auth/internal-error",
      "Identity Toolkit sign-in did not return an idToken",
    );
  }

  const oobResponse = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "VERIFY_EMAIL",
        idToken: signInJson.idToken,
      }),
    },
  );

  if (!oobResponse.ok) {
    const mapped = await readIdentityToolkitError(oobResponse);
    throw identityToolkitError(mapped.code, mapped.message);
  }
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
    await auth.deleteUser(user.uid).catch(() => undefined);
    throw error;
  }

  return { uid: user.uid };
}
