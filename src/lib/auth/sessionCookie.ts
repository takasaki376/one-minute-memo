/** セッション Cookie の契約（実装は PJ1-199-02）。Firebase Admin の慣例に合わせる。 */
export const AUTH_SESSION_COOKIE = {
  name: "__session",
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  /** 本番のみ true。ローカル HTTP では false。 */
  secureInProduction: true,
  /** 5 日（Firebase session cookie は最大 14 日） */
  maxAgeSeconds: 60 * 60 * 24 * 5,
} as const;
