import "server-only";

import { cookies } from "next/headers";

import { buildAuthCookieSetOptions } from "./authCookieOptions";
import { AUTH_SESSION_COOKIE } from "./sessionCookie";

export type { AuthCookieSetOptions } from "./authCookieOptions";
export { buildAuthCookieSetOptions } from "./authCookieOptions";

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
