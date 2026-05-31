import type { ReactNode } from "react";

export type LoadStage = "idle" | "loading" | "loaded" | "error";

export function isLoadStagePending(stage: LoadStage): boolean {
  return stage === "idle" || stage === "loading";
}

export interface PageLoadingProps {
  title: string;
  description: string;
}

export function PageLoading({ title, description }: PageLoadingProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div role="status" aria-live="polite" aria-busy="true">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
    </main>
  );
}

export interface PageErrorProps {
  title: string;
  message?: string | null;
  children: ReactNode;
}

export function PageError({ title, message, children }: PageErrorProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h1>
      {message ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">{children}</div>
    </main>
  );
}
