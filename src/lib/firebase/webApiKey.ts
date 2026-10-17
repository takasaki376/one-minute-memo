import "server-only";

/**
 * Identity Toolkit REST 用の Web API キー（サーバー専用）。
 * クライアントには公開しない。
 */
export function getFirebaseWebApiKey(): string | null {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim() ?? "";
  return apiKey.length > 0 ? apiKey : null;
}

export function isFirebaseWebApiKeyConfigured(): boolean {
  return getFirebaseWebApiKey() !== null;
}
