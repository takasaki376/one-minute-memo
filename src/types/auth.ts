import type { ApiResult } from "@/types/api";

export interface SessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

/** signin 成功後、Admin が session cookie を発行する前段の ID token */
export interface AuthSignInRequest {
  idToken: string;
}

export interface AuthSessionData {
  user: SessionUser | null;
}

export interface AuthSignInData {
  user: SessionUser;
}

export interface AuthSignUpData {
  user: null;
  message: string;
}

export interface AuthSignOutData {
  user: null;
}

export type AuthResponse =
  | ApiResult<AuthSessionData>
  | ApiResult<AuthSignInData>
  | ApiResult<AuthSignUpData>
  | ApiResult<AuthSignOutData>;

export type AuthErrorResponse = Extract<AuthResponse, { success: false }>;
