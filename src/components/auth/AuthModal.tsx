"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  AUTH_SIGNUP_SUCCESS_MESSAGE,
  toAuthErrorMessage,
} from "@/lib/auth/messages";

export type AuthModalMode = "login" | "signup";

export interface AuthModalProps {
  open: boolean;
  mode: AuthModalMode;
  onClose: () => void;
  onModeChange: (mode: AuthModalMode) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthModal({
  open,
  mode,
  onClose,
  onModeChange,
  onSignIn,
  onSignUp,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setEmail("");
    setPassword("");
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) {
    return null;
  }

  const title = mode === "login" ? "ログイン" : "サインアップ";
  const submitLabel = mode === "login" ? "ログイン" : "アカウント作成";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await onSignIn(email, password);
        handleClose();
        return;
      }

      await onSignUp(email, password);
      setSuccessMessage(AUTH_SIGNUP_SUCCESS_MESSAGE);
      setPassword("");
      onModeChange("login");
    } catch (err) {
      setError(toAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop mirrors existing modals; Escape closes via document listener */}
      <div
        role="presentation"
        aria-hidden="true"
        className="absolute inset-0 cursor-pointer bg-slate-900/40"
        onClick={handleClose}
      />
      <dialog
        open
        aria-labelledby="auth-modal-title"
        className="relative z-10 m-0 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl outline-none open:block dark:border-slate-700 dark:bg-slate-900"
      >
        <h2
          id="auth-modal-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          ログインは任意です。未ログインでもメモ機能は利用できます。
        </p>

        <form className="mt-4 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              メールアドレス
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              パスワード
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">6文字以上</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              onClick={() => {
                setError(null);
                setSuccessMessage(null);
                onModeChange(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login"
                ? "アカウントを作成する"
                : "ログイン画面へ"}
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                data-testid="auth-modal-submit"
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
}
