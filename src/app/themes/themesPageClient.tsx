"use client";

import { useEffect, useMemo, useState } from "react";

import { useThemeSeedState } from "@/components/providers/ThemeSeedProvider";
import { Button } from "@/components/ui/Button";
import { getAllThemes } from "@/lib/db/themesRepo";
import type { ThemeRecord } from "@/types/theme";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "success"; themes: ThemeRecord[] }
  | { status: "error"; error: Error };

function formatSource(source: ThemeRecord["source"]) {
  return source === "builtin" ? "builtin" : "user";
}

export default function ThemesPageClient() {
  const { isReady, isSeeding, error: seedError } = useThemeSeedState();
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const canLoad = isReady && !seedError;

  const themes = useMemo(() => {
    if (state.status !== "success") return [];
    return state.themes;
  }, [state]);

  useEffect(() => {
    if (!canLoad) return;
    setState({ status: "loading" });
    getAllThemes()
      .then((records) => setState({ status: "success", themes: records }))
      .catch((e) => {
        const err = e instanceof Error ? e : new Error("failed to load themes");
        setState({ status: "error", error: err });
      });
  }, [canLoad]);

  if (!isReady) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">テーマ管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            テーマの準備が完了するまでお待ちください。
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {seedError
            ? "初期テーマの準備に失敗しました。ページを再読み込みしてください。"
            : isSeeding
              ? "初期テーマを準備しています…"
              : "初期データの準備を待機しています。"}
        </div>
      </div>
    );
  }

  if (seedError) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">テーマ管理</h1>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          初期テーマの準備に失敗しました。ページを再読み込みしてください。
        </div>
        <Button href="/" variant="secondary">
          トップへ戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">テーマ管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            テーマの一覧を確認できます（検索・追加・編集は後続ストーリーで追加）。
          </p>
        </div>
        <div className="text-sm text-slate-600">
          {state.status === "success" ? `${themes.length} 件` : ""}
        </div>
      </header>

      {state.status === "loading" || state.status === "idle" ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          読み込み中…
        </div>
      ) : state.status === "error" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            読み込みに失敗しました。再読み込みしてください。
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: "loading" });
              getAllThemes()
                .then((records) =>
                  setState({ status: "success", themes: records }),
                )
                .catch((e) => {
                  const err =
                    e instanceof Error ? e : new Error("failed to load themes");
                  setState({ status: "error", error: err });
                });
            }}
          >
            再読み込み
          </Button>
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            {state.error.message}
          </pre>
        </div>
      ) : themes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-700">
          テーマがありません。
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            <div className="col-span-6 sm:col-span-5">テーマ名</div>
            <div className="col-span-3 sm:col-span-3">カテゴリ</div>
            <div className="col-span-2 sm:col-span-2">状態</div>
            <div className="col-span-1 sm:col-span-2 text-right">source</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {themes.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-6 sm:col-span-5">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.id}</p>
                  </div>
                  <div className="col-span-3 sm:col-span-3">
                    <p className="truncate text-sm text-slate-700">
                      {t.category}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span
                      className={
                        t.isActive
                          ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {t.isActive ? "有効" : "無効"}
                    </span>
                  </div>
                  <div className="col-span-1 sm:col-span-2 text-right">
                    <span className="text-xs text-slate-600">
                      {formatSource(t.source)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

