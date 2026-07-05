"use client";

import { useState } from "react";

import { AuthModal, type AuthModalMode } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export function HeaderAuthControl() {
  const { user, isLoading, isConfigured, signIn, signUp } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AuthModalMode>("login");

  if (!isConfigured || isLoading) {
    return null;
  }

  if (user) {
    return (
      <span
        className="max-w-[10rem] truncate text-slate-600 dark:text-slate-400"
        title={user.email ?? user.uid}
        data-testid="header-auth-user"
      >
        {user.email ?? "ログイン中"}
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="!px-2 !py-1"
        onClick={() => {
          setModalMode("login");
          setModalOpen(true);
        }}
        data-testid="header-auth-login"
      >
        ログイン
      </Button>
      <AuthModal
        open={modalOpen}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onModeChange={setModalMode}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    </>
  );
}
