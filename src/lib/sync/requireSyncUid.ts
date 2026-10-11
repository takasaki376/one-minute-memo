import "server-only";

import { getAuthCookie } from "@/lib/auth/authCookies";
import { AuthNotConfiguredError } from "@/lib/auth/authErrors";
import { verifyAuthSessionCookie } from "@/lib/auth/sessionToken";

import { SyncNotConfiguredError, SyncUnauthenticatedError } from "./syncErrors";

/** UID はセッション Cookie だけから決める。リクエスト body の uid は使わない。 */
export async function requireSyncUid(): Promise<string> {
  const sessionCookie = await getAuthCookie();
  if (!sessionCookie) {
    throw new SyncUnauthenticatedError();
  }

  try {
    const decoded = await verifyAuthSessionCookie(sessionCookie);
    if (!decoded.uid) {
      throw new SyncUnauthenticatedError();
    }
    return decoded.uid;
  } catch (error) {
    if (error instanceof SyncUnauthenticatedError) {
      throw error;
    }
    if (error instanceof AuthNotConfiguredError) {
      throw new SyncNotConfiguredError();
    }
    throw new SyncUnauthenticatedError();
  }
}
