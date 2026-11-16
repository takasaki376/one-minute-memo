/**
 * Server-side auth failure diagnostics for Vercel / console.error.
 * Allowlisted JSON only — never log secrets, PII, raw messages, or stacks.
 */

export const AUTH_DIAGNOSTIC_EVENT = {
  FAILURE: "auth.failure",
  ROLLBACK_FAILURE: "auth.rollback_failure",
} as const;

export type AuthDiagnosticEventName =
  (typeof AUTH_DIAGNOSTIC_EVENT)[keyof typeof AUTH_DIAGNOSTIC_EVENT];

export type AuthDiagnosticStage =
  | "identity_toolkit.signin"
  | "identity_toolkit.send_verify_email"
  | "admin.initialize"
  | "admin.verify_id_token"
  | "admin.create_session_cookie"
  | "admin.create_user"
  | "admin.rollback_delete_user"
  | "admin.verify_session_cookie"
  | "cookie.set"
  | "cookie.read"
  | "unknown";

export type AuthFailureMeta = {
  stage: AuthDiagnosticStage;
  requestId?: string;
  diagnosticClass?: string;
  missingEnvNames?: readonly string[];
  identityToolkitHttpStatus?: number;
  attempt?: number;
  attempts?: number;
};

/** WeakMap なら凍結／非拡張オブジェクトにもメタを付けられる（公開契約を壊さない） */
const authFailureMetaByError = new WeakMap<object, AuthFailureMeta>();

const ALLOWED_KEYS = [
  "event",
  "timestamp",
  "requestId",
  "route",
  "stage",
  "httpStatus",
  "publicErrorCode",
  "errorName",
  "errorCode",
  "diagnosticClass",
  "missingEnvNames",
  "identityToolkitHttpStatus",
  "attempt",
  "attempts",
] as const;

const ALLOWED_ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
  "AuthNotConfiguredError",
  "FirebaseError",
  "FirebaseAuthError",
]);

/** Firebase Auth / Admin / 公開 AUTH_* のみ。任意文字列は拒否 */
const ALLOWED_ERROR_CODE_RE =
  /^(auth\/[a-z0-9-]+|app\/[a-z0-9-]+|AUTH_[A-Z0-9_]+)$/;

export type AuthDiagnosticPayload = {
  event: AuthDiagnosticEventName;
  timestamp: string;
  requestId: string;
  route: string;
  stage: AuthDiagnosticStage;
  httpStatus: number;
  publicErrorCode: string;
  errorName?: string;
  errorCode?: string;
  diagnosticClass?: string;
  missingEnvNames?: readonly string[];
  identityToolkitHttpStatus?: number;
  attempt?: number;
  attempts?: number;
};

export type AuthDiagnosticSink = (line: string) => void;

const MAX_STRING_FIELD = 120;

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function safeCall<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function createAuthRequestId(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  try {
    return randomUuid();
  } catch {
    return `auth-${Date.now().toString(36)}`;
  }
}

export function getAuthFailureMeta(error: unknown): AuthFailureMeta | undefined {
  return safeCall(() => {
    if (!isObject(error)) return undefined;
    return authFailureMetaByError.get(error);
  }, undefined);
}

/**
 * Attach diagnostic meta without changing instanceof / Firebase `code`.
 * Uses WeakMap so frozen / non-extensible errors still work.
 * Keeps the earliest (innermost) stage when already annotated.
 */
export function annotateAuthFailure(
  error: unknown,
  meta: AuthFailureMeta,
): unknown {
  return safeCall(() => {
    if (!isObject(error)) {
      const wrapped = Object.assign(new Error("Auth failure"), {
        cause: error,
      });
      authFailureMetaByError.set(wrapped, meta);
      return wrapped;
    }

    const existing = authFailureMetaByError.get(error);
    const merged: AuthFailureMeta = existing
      ? {
          ...meta,
          ...existing,
          stage: existing.stage,
          requestId: existing.requestId ?? meta.requestId,
          diagnosticClass: existing.diagnosticClass ?? meta.diagnosticClass,
          missingEnvNames: existing.missingEnvNames ?? meta.missingEnvNames,
          identityToolkitHttpStatus:
            existing.identityToolkitHttpStatus ??
            meta.identityToolkitHttpStatus,
          attempt: meta.attempt ?? existing.attempt,
          attempts: meta.attempts ?? existing.attempts,
        }
      : meta;

    authFailureMetaByError.set(error, merged);
    return error;
  }, error);
}

export function listMissingFirebaseAdminEnvNames(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const required = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ] as const;
  return required.filter((name) => !env[name]?.trim());
}

export function listMissingFirebaseWebApiKeyEnvNames(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return env.FIREBASE_WEB_API_KEY?.trim() ? [] : ["FIREBASE_WEB_API_KEY"];
}

function readRawErrorCode(error: unknown): string | undefined {
  return safeCall(() => {
    if (!isObject(error) || !("code" in error)) return undefined;
    const code = (error as { code: unknown }).code;
    return typeof code === "string" && code.length > 0 ? code : undefined;
  }, undefined);
}

export function extractErrorCode(error: unknown): string | undefined {
  const code = readRawErrorCode(error);
  if (!code || code.length > MAX_STRING_FIELD) return undefined;
  if (!ALLOWED_ERROR_CODE_RE.test(code)) return undefined;
  return code;
}

export function extractErrorName(error: unknown): string | undefined {
  return safeCall(() => {
    let name: string | undefined;
    if (error instanceof Error && error.name) {
      name = error.name;
    } else if (isObject(error) && typeof (error as { name?: unknown }).name === "string") {
      name = (error as { name: string }).name;
    }
    if (!name || name.length > MAX_STRING_FIELD) return undefined;
    if (!ALLOWED_ERROR_NAMES.has(name)) return undefined;
    return name;
  }, undefined);
}

/**
 * Classify Identity Toolkit error messages into fixed diagnostic labels.
 * Uses the message only for classification — never logs it.
 */
export function classifyIdentityToolkitMessage(message: string): string {
  const normalized = message.toUpperCase();
  if (
    normalized.includes("API_KEY_INVALID") ||
    normalized.includes("INVALID_API_KEY")
  ) {
    return "identity_toolkit.api_key_invalid";
  }
  if (
    normalized.includes("API_KEY_HTTP_REFERRER_BLOCKED") ||
    normalized.includes("API_KEY_IP_ADDRESS_BLOCKED") ||
    normalized.includes("API_KEY_SERVICE_BLOCKED") ||
    normalized.includes("API_KEY_NOT_VALID")
  ) {
    return "identity_toolkit.api_key_restricted";
  }
  if (normalized.includes("OPERATION_NOT_ALLOWED")) {
    return "identity_toolkit.operation_not_allowed";
  }
  if (
    normalized.includes("INVALID_PASSWORD") ||
    normalized.includes("EMAIL_NOT_FOUND") ||
    normalized.includes("INVALID_LOGIN_CREDENTIALS")
  ) {
    return "identity_toolkit.invalid_credentials";
  }
  if (normalized.includes("EMAIL_EXISTS")) {
    return "identity_toolkit.email_exists";
  }
  if (normalized.includes("USER_DISABLED")) {
    return "identity_toolkit.user_disabled";
  }
  if (normalized.includes("TOO_MANY_ATTEMPTS")) {
    return "identity_toolkit.too_many_attempts";
  }
  if (normalized.includes("WEAK_PASSWORD")) {
    return "identity_toolkit.weak_password";
  }
  if (normalized.includes("INVALID_EMAIL")) {
    return "identity_toolkit.invalid_email";
  }
  return "identity_toolkit.unknown";
}

/**
 * Classify Admin SDK / credential failures without logging raw text.
 */
export function classifyAdminAuthError(error: unknown): string {
  const code = (readRawErrorCode(error) ?? "").toLowerCase();
  const message = safeCall(() => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "";
  }, "");
  const lower = message.toLowerCase();

  if (
    code.includes("invalid-credential") ||
    /decoder|pem|private.?key|openssl|failed to parse/i.test(lower)
  ) {
    return "admin.credential_invalid";
  }
  if (
    code.includes("insufficient") ||
    /permission|insufficient|unauthorized/i.test(lower)
  ) {
    return "admin.permission_denied";
  }
  if (/module|err_require_esm|cannot find module|jose/i.test(lower)) {
    return "admin.runtime_dependency";
  }
  if (code) {
    return "admin.firebase_error";
  }
  return "admin.unknown";
}

function sanitizeStringList(
  values: readonly string[] | undefined,
): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  const cleaned = values
    .filter((v) => typeof v === "string" && v.length > 0)
    .map((v) => v.slice(0, MAX_STRING_FIELD))
    .slice(0, 16);
  return cleaned.length > 0 ? cleaned : undefined;
}

function buildAllowlistedPayload(
  input: AuthDiagnosticPayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (key === "missingEnvNames") {
      const list = sanitizeStringList(value as readonly string[] | undefined);
      if (list) out[key] = list;
      continue;
    }
    if (typeof value === "string") {
      out[key] = value.slice(0, MAX_STRING_FIELD * 2);
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
      continue;
    }
  }
  return out;
}

/**
 * Emit a single JSON line. Never throws; never alters auth responses.
 */
export function logAuthDiagnostic(
  payload: AuthDiagnosticPayload,
  sink: AuthDiagnosticSink = (line) => {
    console.error(line);
  },
): void {
  try {
    const safe = buildAllowlistedPayload(payload);
    sink(JSON.stringify(safe));
  } catch {
    try {
      sink(
        JSON.stringify({
          event: AUTH_DIAGNOSTIC_EVENT.FAILURE,
          timestamp: new Date().toISOString(),
          requestId: "logger-failed",
          route: "unknown",
          stage: "unknown",
          httpStatus: 500,
          publicErrorCode: "AUTH_INTERNAL",
          diagnosticClass: "logger.serialize_failed",
        }),
      );
    } catch {
      // give up silently
    }
  }
}

/**
 * 例外に付いた相関 ID だけを返す。無いときは undefined（Handler 側の requestId にフォールバック）。
 * ここで新規 ID を発行すると、同一 HTTP リクエストのログ相関が壊れる。
 */
export function resolveAuthFailureRequestId(
  error: unknown,
): string | undefined {
  return getAuthFailureMeta(error)?.requestId;
}

export function buildAuthFailurePayload(options: {
  event?: AuthDiagnosticEventName;
  error: unknown;
  requestId: string;
  route: string;
  httpStatus: number;
  publicErrorCode: string;
  stage?: AuthDiagnosticStage;
  attempt?: number;
  attempts?: number;
}): AuthDiagnosticPayload {
  const meta = getAuthFailureMeta(options.error);
  return {
    event: options.event ?? AUTH_DIAGNOSTIC_EVENT.FAILURE,
    timestamp: new Date().toISOString(),
    requestId: meta?.requestId ?? options.requestId,
    route: options.route,
    stage: options.stage ?? meta?.stage ?? "unknown",
    httpStatus: options.httpStatus,
    publicErrorCode: options.publicErrorCode,
    errorName: extractErrorName(options.error),
    errorCode: extractErrorCode(options.error),
    diagnosticClass: meta?.diagnosticClass,
    missingEnvNames: meta?.missingEnvNames,
    identityToolkitHttpStatus: meta?.identityToolkitHttpStatus,
    attempt: options.attempt ?? meta?.attempt,
    attempts: options.attempts ?? meta?.attempts,
  };
}

function fallbackPayload(options: {
  requestId: string;
  route: string;
  httpStatus: number;
  publicErrorCode: string;
}): AuthDiagnosticPayload {
  return {
    event: AUTH_DIAGNOSTIC_EVENT.FAILURE,
    timestamp: new Date().toISOString(),
    requestId: options.requestId || "logger-failed",
    route: options.route || "unknown",
    stage: "unknown",
    httpStatus: options.httpStatus || 500,
    publicErrorCode: options.publicErrorCode || "AUTH_INTERNAL",
    diagnosticClass: "logger.payload_failed",
  };
}

/** Log only server faults (HTTP >= 500). Never throws into handlers. */
export function logAuthHandlerFault(options: {
  error: unknown;
  requestId: string;
  route: string;
  httpStatus: number;
  publicErrorCode: string;
  sink?: AuthDiagnosticSink;
}): void {
  try {
    if (options.httpStatus < 500) return;
    const payload = safeCall(
      () => buildAuthFailurePayload(options),
      fallbackPayload(options),
    );
    logAuthDiagnostic(payload, options.sink);
  } catch {
    // never alter auth responses
  }
}
