"use client";

import { useEffect, useState } from "react";

/**
 * Serwist が生成する /sw.js を登録し、更新があればユーザー操作で反映する。
 * 開発時は next.config で Serwist が無効のため何もしない。
 */
export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !navigator.serviceWorker
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let cancelled = false;

    const onControllerChange = () => {
      window.location.reload();
    };

    const trackWaiting = (reg: ServiceWorkerRegistration) => {
      const waiting = reg.waiting;
      if (waiting) {
        setWaitingWorker(waiting);
      }
    };

    const onUpdateFound = () => {
      const installing = registration?.installing;
      if (!installing) {
        return;
      }

      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          trackWaiting(registration!);
        }
      });
    };

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) {
          return;
        }
        registration = reg;
        trackWaiting(reg);
        reg.addEventListener("updatefound", onUpdateFound);
      })
      .catch((error: unknown) => {
        console.warn("Service Worker registration failed:", error);
      });

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      registration?.removeEventListener("updatefound", onUpdateFound);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const handleUpdate = () => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    setWaitingWorker(null);
  };

  if (!waitingWorker) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          新しいバージョンが利用できます。更新して最新版に切り替えてください。
        </p>
        <button
          type="button"
          onClick={handleUpdate}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          data-testid="pwa-update-button"
        >
          更新する
        </button>
      </div>
    </div>
  );
}
