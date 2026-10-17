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
import type { SessionUser } from "@/types/auth";

export type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const session = await fetchAuthSession();
        if (!cancelled) {
          setUser(session.user);
          setIsConfigured(session.configured);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsConfigured(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextUser = await postAuthSignIn(email.trim(), password);
    setUser(nextUser);
    setIsConfigured(true);
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
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, isConfigured, signIn, signUp, signOut],
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
