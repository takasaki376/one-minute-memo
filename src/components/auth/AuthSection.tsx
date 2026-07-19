"use client";

import { useState } from "react";

import { AuthModal, type AuthModalMode } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { toAuthErrorMessage } from "@/lib/auth/messages";

export function AuthSection() {
  const { user, isLoading, isConfigured, signIn, signUp, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AuthModalMode>("login");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const openModal = (mode: AuthModalMode) => {
    setActionError(null);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleSignOut = async () => {
    setActionError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      setActionError(toAuthErrorMessage(err));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <section
      id="account"
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      aria-label="アカウント"
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        アカウント
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        ログインすると、クラウドへのデータ同期が利用できます。
      </p>

      {!isConfigured && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          認証機能は Firebase 未設定のため利用できません。環境変数を設定すると有効になります。
        </p>
      )}

      {isConfigured && isLoading && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          認証状態を確認しています...
        </p>
      )}

      {isConfigured && !isLoading && user && (
        <div className="mt-4 space-y-3">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">メールアドレス</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {user.email ?? "（未設定）"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">UID</dt>
              <dd className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                {user.uid}
              </dd>
            </div>
          </dl>
          {actionError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {actionError}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isSigningOut}
            onClick={() => void handleSignOut()}
            data-testid="auth-sign-out"
          >
            ログアウト
          </Button>
        </div>
      )}

      {isConfigured && !isLoading && !user && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => openModal("login")}
            data-testid="auth-open-login"
          >
            ログイン
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => openModal("signup")}
            data-testid="auth-open-signup"
          >
            サインアップ
          </Button>
        </div>
      )}

      <AuthModal
        open={modalOpen && isConfigured}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onModeChange={setModalMode}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    </section>
  );
}
