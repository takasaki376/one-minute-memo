import { clearAuthCookie } from "@/lib/auth/authCookies";
import { handleSignoutPost } from "@/lib/auth/signoutHandler";

export async function POST(): Promise<Response> {
  return handleSignoutPost({ clearAuthCookie });
}
