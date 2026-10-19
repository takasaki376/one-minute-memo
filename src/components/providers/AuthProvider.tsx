"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchAuthSession,
  postAuthSignIn,
  postAuthSignOut,
  postAuthSignUp,
} from "@/lib/auth/clientApi";
import { AUTH_ERROR_CODES, authErrorMessage } from "@/lib/auth/errorContract";
import type { SessionUser } from "@/types/auth";

export type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  /** セッション取得の一時的な失敗。未設定とは別。 */
  sessionError: string | null;
  refreshSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return authErrorMessage(AUTH_ERROR_CODES.NETWORK);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError(null);
    try {
      const session = await fetchAuthSession();
      setUser(session.user);
      setIsConfigured(session.configured);
    } catch (error) {
      // 通信失敗を「未設定」にしない。ログイン入口は残し、再試行で復旧できる。
      setUser(null);
      setIsConfigured(true);
      setSessionError(sessionFailureMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextUser = await postAuthSignIn(email.trim(), password);
    setUser(nextUser);
    setIsConfigured(true);
    setSessionError(null);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await postAuthSignUp(email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    await postAuthSignOut();
    setUser(null);
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({
      user,
      isLoading,
      isConfigured,
      sessionError,
      refreshSession,
      signIn,
      signUp,
      signOut,
    }),
    [
      user,
      isLoading,
      isConfigured,
      sessionError,
      refreshSession,
      signIn,
      signUp,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
