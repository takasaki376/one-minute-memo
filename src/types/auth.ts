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

/** サーバーが Identity Toolkit + Admin でセッションを発行する */
export interface AuthSignInRequest {
  email: string;
  password: string;
}

export interface AuthSessionData {
  user: SessionUser | null;
  /** Admin + Web API キーが揃っているか（ログイン UI の有効判定） */
  configured: boolean;
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
