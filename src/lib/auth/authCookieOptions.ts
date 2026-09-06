import { AUTH_SESSION_COOKIE } from "./sessionCookie";

export type AuthCookieSetOptions = {
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  secure: boolean;
  maxAge: number;
};

export function buildAuthCookieSetOptions(): AuthCookieSetOptions {
  return {
    httpOnly: AUTH_SESSION_COOKIE.httpOnly,
    sameSite: AUTH_SESSION_COOKIE.sameSite,
    path: AUTH_SESSION_COOKIE.path,
    secure:
      AUTH_SESSION_COOKIE.secureInProduction &&
      process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_COOKIE.maxAgeSeconds,
  };
}
