import { setAuthCookie } from "@/lib/auth/authCookies";
import { signInWithIdToken } from "@/lib/auth/signin";
import { handleSigninPost } from "@/lib/auth/signinHandler";

export async function POST(request: Request): Promise<Response> {
  return handleSigninPost(request, { signInWithIdToken, setAuthCookie });
}
