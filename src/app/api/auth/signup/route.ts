import { createAuthUser } from "@/lib/auth/signup";
import { handleSignupPost } from "@/lib/auth/signupHandler";

export async function POST(request: Request): Promise<Response> {
  return handleSignupPost(request, { createAuthUser });
}
