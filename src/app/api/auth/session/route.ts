import { clearAuthCookie, getAuthCookie } from "@/lib/auth/authCookies";
import { handleSessionGet } from "@/lib/auth/sessionHandler";
import { verifyAuthSessionCookie } from "@/lib/auth/sessionToken";

export async function GET(): Promise<Response> {
  return handleSessionGet({
    getAuthCookie,
    verifySessionCookie: verifyAuthSessionCookie,
    clearAuthCookie,
  });
}
