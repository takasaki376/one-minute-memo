export const AUTH_ERROR_CODES = {
  INVALID_EMAIL: "AUTH_INVALID_EMAIL",
  INVALID_CREDENTIAL: "AUTH_INVALID_CREDENTIAL",
  EMAIL_ALREADY_IN_USE: "AUTH_EMAIL_ALREADY_IN_USE",
  WEAK_PASSWORD: "AUTH_WEAK_PASSWORD",
  USER_DISABLED: "AUTH_USER_DISABLED",
  TOO_MANY_REQUESTS: "AUTH_TOO_MANY_REQUESTS",
  NETWORK: "AUTH_NETWORK",
  NOT_CONFIGURED: "AUTH_NOT_CONFIGURED",
  UNAUTHENTICATED: "AUTH_UNAUTHENTICATED",
  VALIDATION: "AUTH_VALIDATION",
  INTERNAL: "AUTH_INTERNAL",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  AUTH_INVALID_EMAIL: "メールアドレスの形式が正しくありません",
  AUTH_INVALID_CREDENTIAL:
    "メールアドレスまたはパスワードが正しくありません",
  AUTH_EMAIL_ALREADY_IN_USE: "このメールアドレスは既に登録されています",
  AUTH_WEAK_PASSWORD: "パスワードは6文字以上で入力してください",
  AUTH_USER_DISABLED: "このアカウントは無効化されています",
  AUTH_TOO_MANY_REQUESTS:
    "試行回数が多すぎます。しばらく待ってから再度お試しください",
  AUTH_NETWORK: "ネットワークエラーが発生しました",
  AUTH_NOT_CONFIGURED: "認証機能は現在利用できません（Firebase 未設定）",
  AUTH_UNAUTHENTICATED: "ログインしていません",
  AUTH_VALIDATION: "メールアドレスとパスワードを入力してください",
  AUTH_INTERNAL: "認証処理に失敗しました",
};

export const AUTH_SIGNUP_SUCCESS_MESSAGE =
  "アカウントを作成しました。確認メールを送信しました。メール内のリンクから認証を完了してください。";

const FIREBASE_AUTH_CODE_MAP: Record<string, AuthErrorCode> = {
  "auth/invalid-email": AUTH_ERROR_CODES.INVALID_EMAIL,
  "auth/user-disabled": AUTH_ERROR_CODES.USER_DISABLED,
  "auth/user-not-found": AUTH_ERROR_CODES.INVALID_CREDENTIAL,
  "auth/wrong-password": AUTH_ERROR_CODES.INVALID_CREDENTIAL,
  "auth/invalid-credential": AUTH_ERROR_CODES.INVALID_CREDENTIAL,
  "auth/email-already-in-use": AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE,
  "auth/weak-password": AUTH_ERROR_CODES.WEAK_PASSWORD,
  "auth/too-many-requests": AUTH_ERROR_CODES.TOO_MANY_REQUESTS,
  "auth/network-request-failed": AUTH_ERROR_CODES.NETWORK,
};

export function toAuthErrorCode(firebaseCode: string | undefined): AuthErrorCode {
  if (!firebaseCode) {
    return AUTH_ERROR_CODES.INTERNAL;
  }
  return FIREBASE_AUTH_CODE_MAP[firebaseCode] ?? AUTH_ERROR_CODES.INTERNAL;
}

export function authErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code];
}
