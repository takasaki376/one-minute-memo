import type { SessionUser } from "@/types/auth";

export type DecodedIdTokenLike = {
  uid: string;
  email?: string;
  email_verified?: boolean;
};

export function decodedIdTokenToSessionUser(
  decoded: DecodedIdTokenLike,
): SessionUser {
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified ?? false,
  };
}
