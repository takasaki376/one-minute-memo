import "server-only";

import { getFirebaseWebApiKey } from "@/lib/firebase/webApiKey";

import {
  annotateAuthFailure,
  classifyIdentityToolkitMessage,
  listMissingFirebaseWebApiKeyEnvNames,
  type AuthDiagnosticStage,
} from "./authDiagnostics";
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

export function identityToolkitError(
  code: string,
  message: string,
  extras?: {
    diagnosticClass?: string;
    httpStatus?: number;
  },
): Error {
  return Object.assign(new Error(message), {
    code,
    diagnosticClass: extras?.diagnosticClass,
    identityToolkitHttpStatus: extras?.httpStatus,
  });
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
): Promise<{
  code: string;
  message: string;
  diagnosticClass: string;
  httpStatus: number;
}> {
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
    diagnosticClass: classifyIdentityToolkitMessage(message),
    httpStatus: response.status,
  };
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function throwAnnotatedIdentityError(
  error: unknown,
  stage: AuthDiagnosticStage,
  extras?: {
    diagnosticClass?: string;
    httpStatus?: number;
  },
): never {
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : null;
  throw annotateAuthFailure(error, {
    stage,
    diagnosticClass:
      extras?.diagnosticClass ??
      readOptionalString(record?.diagnosticClass),
    identityToolkitHttpStatus:
      extras?.httpStatus ??
      readOptionalNumber(record?.identityToolkitHttpStatus),
  });
}

/**
 * Identity Toolkit REST で email/password から ID token を取得する。
 */
export async function fetchIdTokenWithPassword(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const stage: AuthDiagnosticStage = "identity_toolkit.signin";
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    throw annotateAuthFailure(new AuthNotConfiguredError(), {
      stage,
      diagnosticClass: "config.missing_env",
      missingEnvNames: listMissingFirebaseWebApiKeyEnvNames(),
    });
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
    throwAnnotatedIdentityError(
      identityToolkitError(
        "auth/network-request-failed",
        error instanceof Error ? error.message : "Network request failed",
        { diagnosticClass: "identity_toolkit.network" },
      ),
      stage,
      { diagnosticClass: "identity_toolkit.network" },
    );
  }

  if (!response.ok) {
    const mapped = await readIdentityToolkitError(response);
    throwAnnotatedIdentityError(
      identityToolkitError(mapped.code, mapped.message, {
        diagnosticClass: mapped.diagnosticClass,
        httpStatus: mapped.httpStatus,
      }),
      stage,
      {
        diagnosticClass: mapped.diagnosticClass,
        httpStatus: mapped.httpStatus,
      },
    );
  }

  let json: IdentityToolkitSignInResponse;
  try {
    json = (await response.json()) as IdentityToolkitSignInResponse;
  } catch {
    throwAnnotatedIdentityError(
      identityToolkitError(
        "auth/internal-error",
        "Identity Toolkit returned invalid JSON",
        { diagnosticClass: "identity_toolkit.invalid_json" },
      ),
      stage,
      { diagnosticClass: "identity_toolkit.invalid_json" },
    );
  }

  if (!json.idToken) {
    throwAnnotatedIdentityError(
      identityToolkitError(
        "auth/internal-error",
        "Identity Toolkit sign-in did not return an idToken",
        { diagnosticClass: "identity_toolkit.missing_id_token" },
      ),
      stage,
      { diagnosticClass: "identity_toolkit.missing_id_token" },
    );
  }

  return json.idToken;
}

export async function sendVerifyEmailOobCode(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const stage: AuthDiagnosticStage = "identity_toolkit.send_verify_email";
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    throw annotateAuthFailure(new AuthNotConfiguredError(), {
      stage,
      diagnosticClass: "config.missing_env",
      missingEnvNames: listMissingFirebaseWebApiKeyEnvNames(),
    });
  }

  let oobResponse: Response;
  try {
    oobResponse = await fetchImpl(
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
  } catch (error) {
    // 公開契約は AUTH_INTERNAL を維持。ネットワーク区別は diagnosticClass のみ。
    throwAnnotatedIdentityError(
      identityToolkitError(
        "auth/internal-error",
        error instanceof Error ? error.message : "Network request failed",
        { diagnosticClass: "identity_toolkit.network" },
      ),
      stage,
      { diagnosticClass: "identity_toolkit.network" },
    );
  }

  if (!oobResponse.ok) {
    const mapped = await readIdentityToolkitError(oobResponse);
    throwAnnotatedIdentityError(
      identityToolkitError(mapped.code, mapped.message, {
        diagnosticClass: mapped.diagnosticClass,
        httpStatus: mapped.httpStatus,
      }),
      stage,
      {
        diagnosticClass: mapped.diagnosticClass,
        httpStatus: mapped.httpStatus,
      },
    );
  }
}
