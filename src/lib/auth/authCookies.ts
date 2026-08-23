import { cookies } from "next/headers";

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

export async function getAuthCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(AUTH_SESSION_COOKIE.name)?.value;
}

export async function setAuthCookie(sessionCookie: string): Promise<void> {
  const store = await cookies();
  store.set(AUTH_SESSION_COOKIE.name, sessionCookie, buildAuthCookieSetOptions());
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete({
    name: AUTH_SESSION_COOKIE.name,
    path: AUTH_SESSION_COOKIE.path,
  });
}
