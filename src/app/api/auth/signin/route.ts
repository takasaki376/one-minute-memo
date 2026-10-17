import { setAuthCookie } from "@/lib/auth/authCookies";
import { signInWithPassword } from "@/lib/auth/signin";
import { handleSigninPost } from "@/lib/auth/signinHandler";

export async function POST(request: Request): Promise<Response> {
  return handleSigninPost(request, { signInWithPassword, setAuthCookie });
}
