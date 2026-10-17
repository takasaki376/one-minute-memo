import "server-only";

import { getFirebaseWebApiKey } from "@/lib/firebase/webApiKey";

import { AuthNotConfiguredError } from "./authErrors";

type IdentityToolkitErrorBody = {
  error?: {
    message?: string;
    errors?: Array<{ message?: string }>;
  };
};

type IdentityToolkitSignInResponse = {
  idToken?: string;
};

export function identityToolkitError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

export function mapIdentityToolkitMessage(message: string): string {
  const normalized = message.toUpperCase();
  if (
    normalized.includes("INVALID_PASSWORD") ||
    normalized.includes("EMAIL_NOT_FOUND") ||
    normalized.includes("INVALID_LOGIN_CREDENTIALS")
  ) {
    return "auth/invalid-credential";
  }
  if (normalized.includes("EMAIL_EXISTS")) {
    return "auth/email-already-in-use";
  }
  if (normalized.includes("INVALID_EMAIL")) {
    return "auth/invalid-email";
  }
  if (normalized.includes("USER_DISABLED")) {
    return "auth/user-disabled";
  }
  if (normalized.includes("TOO_MANY_ATTEMPTS")) {
    return "auth/too-many-requests";
  }
  if (normalized.includes("WEAK_PASSWORD")) {
    return "auth/weak-password";
  }
  return "auth/internal-error";
}

export async function readIdentityToolkitError(
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

  return {
    code: mapIdentityToolkitMessage(message),
    message,
  };
}

/**
 * Identity Toolkit REST で email/password から ID token を取得する。
 */
export async function fetchIdTokenWithPassword(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    throw new AuthNotConfiguredError();
  }

  let response: Response;
  try {
    response = await fetchImpl(
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
  } catch (error) {
    throw identityToolkitError(
      "auth/network-request-failed",
      error instanceof Error ? error.message : "Network request failed",
    );
  }

  if (!response.ok) {
    const mapped = await readIdentityToolkitError(response);
    throw identityToolkitError(mapped.code, mapped.message);
  }

  let json: IdentityToolkitSignInResponse;
  try {
    json = (await response.json()) as IdentityToolkitSignInResponse;
  } catch {
    throw identityToolkitError(
      "auth/internal-error",
      "Identity Toolkit returned invalid JSON",
    );
  }

  if (!json.idToken) {
    throw identityToolkitError(
      "auth/internal-error",
      "Identity Toolkit sign-in did not return an idToken",
    );
  }

  return json.idToken;
}

export async function sendVerifyEmailOobCode(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    throw new AuthNotConfiguredError();
  }

  const oobResponse = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "VERIFY_EMAIL",
        idToken,
      }),
    },
  );

  if (!oobResponse.ok) {
    const mapped = await readIdentityToolkitError(oobResponse);
    throw identityToolkitError(mapped.code, mapped.message);
  }
}
