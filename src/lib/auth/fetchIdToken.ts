import { getFirebaseConfig } from "@/lib/firebase/env";

import { AuthApiError, type AuthFetch } from "./clientApi";
import { AUTH_ERROR_CODES, authErrorMessage, toAuthErrorCode } from "./errorContract";

type IdentityToolkitErrorBody = {
  error?: {
    message?: string;
    errors?: Array<{ message?: string }>;
  };
};

type IdentityToolkitSignInResponse = {
  idToken?: string;
};

function mapIdentityToolkitMessage(message: string): string {
  const normalized = message.toUpperCase();
  if (
    normalized.includes("INVALID_PASSWORD") ||
    normalized.includes("EMAIL_NOT_FOUND") ||
    normalized.includes("INVALID_LOGIN_CREDENTIALS")
  ) {
    return "auth/invalid-credential";
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

async function readIdentityToolkitError(response: Response): Promise<AuthApiError> {
  let body: IdentityToolkitErrorBody = {};
  try {
    body = (await response.json()) as IdentityToolkitErrorBody;
  } catch {
    // ignore
  }

  const message =
    body.error?.message ??
    body.error?.errors?.[0]?.message ??
    `Identity Toolkit request failed (${response.status})`;

  const firebaseCode = mapIdentityToolkitMessage(message);
  const code = toAuthErrorCode(firebaseCode);
  return new AuthApiError(code, authErrorMessage(code));
}

/**
 * Exchange email/password for an ID token via Identity Toolkit REST
 * (no firebase/auth SDK). Used before POST /api/auth/signin.
 */
export async function fetchIdTokenWithPassword(
  email: string,
  password: string,
  fetchImpl: AuthFetch = fetch,
): Promise<string> {
  const config = getFirebaseConfig();
  if (!config?.apiKey) {
    throw new AuthApiError(
      AUTH_ERROR_CODES.NOT_CONFIGURED,
      authErrorMessage(AUTH_ERROR_CODES.NOT_CONFIGURED),
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`,
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
  } catch {
    throw new AuthApiError(
      AUTH_ERROR_CODES.NETWORK,
      authErrorMessage(AUTH_ERROR_CODES.NETWORK),
    );
  }

  if (!response.ok) {
    throw await readIdentityToolkitError(response);
  }

  const json = (await response.json()) as IdentityToolkitSignInResponse;
  if (!json.idToken) {
    throw new AuthApiError(
      AUTH_ERROR_CODES.INTERNAL,
      authErrorMessage(AUTH_ERROR_CODES.INTERNAL),
    );
  }

  return json.idToken;
}
