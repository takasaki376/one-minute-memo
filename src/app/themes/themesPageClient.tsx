"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useThemeSeedState } from "@/components/providers/ThemeSeedProvider";
import { Button } from "@/components/ui/Button";
import {
  createUserTheme,
  getAllThemes,
  toggleThemeActive,
  updateTheme,
} from "@/lib/db/themesRepo";
import { getMemoCountsByThemeIds } from "@/lib/db/memosRepo";
import type { ThemeRecord } from "@/types/theme";

const ADD_TITLE_MAX = 200;
const ADD_CATEGORY_MAX = 100;

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
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set());
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addIsActive, setAddIsActive] = useState(true);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [editingTheme, setEditingTheme] = useState<ThemeRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [memoCounts, setMemoCounts] = useState<Record<string, number>>({});

  const canLoad = isReady && !seedError;

  const themes = useMemo(() => {
    if (state.status !== "success") return [];
    return state.themes;
  }, [state]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        themes
          .map((t) => t.category.trim())
          .filter((c) => c.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b, "ja"));
    return unique;
  }, [themes]);

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const category = categoryFilter;
    return themes.filter((t) => {
      if (category !== null && t.category !== category) return false;
      if (q.length === 0) return true;
      const title = t.title.trim().toLowerCase();
      return title.includes(q);
    });
  }, [themes, searchQuery, categoryFilter]);

  useEffect(() => {
    if (themes.length === 0) {
      setMemoCounts({});
      return;
    }
    getMemoCountsByThemeIds(themes.map((t) => t.id))
      .then((counts) => setMemoCounts(counts))
      .catch(() => setMemoCounts({}));
  }, [themes]);

  const updateThemeActive = async (theme: ThemeRecord, nextActive: boolean) => {
    setUpdateError(null);
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(theme.id);
      return next;
    });

    // optimistic update
    setState((prev) => {
      if (prev.status !== "success") return prev;
      return {
        status: "success",
        themes: prev.themes.map((t) =>
          t.id === theme.id ? { ...t, isActive: nextActive } : t,
        ),
      };
    });

    try {
      await toggleThemeActive(theme.id, nextActive);
    } catch (e) {
      // rollback on error
      setState((prev) => {
        if (prev.status !== "success") return prev;
        return {
          status: "success",
          themes: prev.themes.map((t) =>
            t.id === theme.id ? { ...t, isActive: theme.isActive } : t,
          ),
        };
      });
      setUpdateError(
        e instanceof Error ? e.message : "テーマの更新に失敗しました",
      );
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(theme.id);
        return next;
      });
    }
  };

  const resetAddForm = useCallback(() => {
    setAddTitle("");
    setAddCategory("");
    setAddIsActive(true);
    setAddFormError(null);
  }, []);

  const closeAddModal = useCallback(() => {
    setAddOpen(false);
    resetAddForm();
  }, [resetAddForm]);

  const resetEditForm = useCallback(() => {
    setEditingTheme(null);
    setEditTitle("");
    setEditCategory("");
    setEditIsActive(true);
    setEditFormError(null);
  }, []);

  const closeEditModal = useCallback(() => {
    resetEditForm();
  }, [resetEditForm]);

  const openAddModal = () => {
    closeEditModal();
    resetAddForm();
    setAddOpen(true);
  };

  const openEditModal = (theme: ThemeRecord) => {
    setAddOpen(false);
    resetAddForm();
    setEditFormError(null);
    setEditingTheme(theme);
    setEditTitle(theme.title);
    setEditCategory(theme.category === "未分類" ? "" : theme.category);
    setEditIsActive(theme.isActive);
  };

  useEffect(() => {
    if (!addOpen && !editingTheme) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (editingTheme) closeEditModal();
        else closeAddModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [addOpen, editingTheme, closeAddModal, closeEditModal]);

  const submitAddTheme = async (e: FormEvent) => {
    e.preventDefault();
    setAddFormError(null);
    const t = addTitle.trim();
    const c = addCategory.trim();
    if (t.length === 0) {
      setAddFormError("テーマ名を入力してください");
      return;
    }
    if (t.length > ADD_TITLE_MAX) {
      setAddFormError(
        `テーマ名は${String(ADD_TITLE_MAX)}文字以内にしてください`,
      );
      return;
    }
    if (c.length > ADD_CATEGORY_MAX) {
      setAddFormError(
        `カテゴリは${String(ADD_CATEGORY_MAX)}文字以内にしてください`,
      );
      return;
    }
    setAddSaving(true);
    try {
      const created = await createUserTheme({
        title: addTitle,
        category: addCategory,
        isActive: addIsActive,
      });
      setState((prev) => {
        if (prev.status !== "success") return prev;
        return {
          status: "success",
          themes: [...prev.themes, created],
        };
      });
      closeAddModal();
    } catch (err) {
      setAddFormError(
        err instanceof Error ? err.message : "テーマの追加に失敗しました",
      );
    } finally {
      setAddSaving(false);
    }
  };

  const submitEditTheme = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTheme) return;
    setEditFormError(null);
    const t = editTitle.trim();
    const c = editCategory.trim();
    if (t.length === 0) {
      setEditFormError("テーマ名を入力してください");
      return;
    }
    if (t.length > ADD_TITLE_MAX) {
      setEditFormError(
        `テーマ名は${String(ADD_TITLE_MAX)}文字以内にしてください`,
      );
      return;
    }
    if (c.length > ADD_CATEGORY_MAX) {
      setEditFormError(
        `カテゴリは${String(ADD_CATEGORY_MAX)}文字以内にしてください`,
      );
      return;
    }
    const themeId = editingTheme.id;
    setEditSaving(true);
    try {
      const saved = await updateTheme(themeId, {
        title: editTitle,
        category: editCategory,
        isActive: editIsActive,
      });
      setState((prev) => {
        if (prev.status !== "success") return prev;
        return {
          status: "success",
          themes: prev.themes.map((row) =>
            row.id === themeId ? saved : row,
          ),
        };
      });
      closeEditModal();
    } catch (err) {
      setEditFormError(
        err instanceof Error ? err.message : "テーマの更新に失敗しました",
      );
    } finally {
      setEditSaving(false);
    }
  };

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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">テーマ管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            テーマの一覧を確認し、検索・編集・有効/無効・追加ができます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state.status === "success" && (
            <>
              <span className="text-sm text-slate-600">{`${filteredThemes.length} / ${themes.length} 件`}</span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openAddModal}
                data-testid="themes-add-open"
              >
                テーマを追加
              </Button>
            </>
          )}
        </div>
      </header>

      {updateError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {updateError}
        </div>
      )}

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
          テーマがありません。「テーマを追加」から登録できます。
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label
                  htmlFor="themes-search"
                  className="block text-xs font-medium text-slate-600"
                >
                  テーマ名で検索
                </label>
                <input
                  id="themes-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="例: 仕事、健康、学び…"
                />
              </div>
              <div className="w-full sm:w-64">
                <label
                  htmlFor="themes-category"
                  className="block text-xs font-medium text-slate-600"
                >
                  カテゴリで絞り込み
                </label>
                <select
                  id="themes-category"
                  value={categoryFilter ?? ""}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value.length > 0 ? e.target.value : null)
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">すべて</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(searchQuery.trim().length > 0 || categoryFilter !== null) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  {filteredThemes.length} 件ヒット
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter(null);
                  }}
                >
                  フィルタをクリア
                </Button>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            <div className="col-span-5 sm:col-span-4">テーマ名</div>
            <div className="col-span-3 sm:col-span-3">カテゴリ</div>
            <div className="col-span-2 sm:col-span-2">状態</div>
            <div className="hidden sm:block sm:col-span-1">切替</div>
            <div className="col-span-1 sm:col-span-1 text-right">source</div>
            <div className="hidden sm:block sm:col-span-1 text-right">メモ数</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filteredThemes.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-600">
                条件に一致するテーマがありません。
              </li>
            ) : (
              filteredThemes.map((t) => (
              <li key={t.id} className="px-4 py-3">
                {(() => {
                  const isUpdating = updatingIds.has(t.id);
                  return (
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5 sm:col-span-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {t.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t.id}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-slate-600"
                        onClick={() => openEditModal(t)}
                        data-testid={`themes-edit-${t.id}`}
                      >
                        編集
                      </Button>
                    </div>
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
                  <div className="col-span-1 sm:col-span-1">
                    <button
                      type="button"
                      className={
                        isUpdating
                          ? "h-6 w-10 rounded-full bg-slate-200 opacity-60"
                          : t.isActive
                            ? "h-6 w-10 rounded-full bg-emerald-500 transition-colors hover:bg-emerald-600"
                            : "h-6 w-10 rounded-full bg-slate-200 transition-colors hover:bg-slate-300"
                      }
                      aria-label={
                        t.isActive ? "テーマを無効化" : "テーマを有効化"
                      }
                      disabled={isUpdating}
                      onClick={() => void updateThemeActive(t, !t.isActive)}
                    >
                      <span
                        className={
                          isUpdating
                            ? "block h-5 w-5 translate-x-1 rounded-full bg-white shadow"
                            : t.isActive
                              ? "block h-5 w-5 translate-x-4 rounded-full bg-white shadow transition-transform"
                              : "block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform"
                        }
                      />
                    </button>
                  </div>
                  <div className="col-span-1 sm:col-span-1 text-right">
                    <span className="text-xs text-slate-600">
                      {formatSource(t.source)}
                    </span>
                  </div>
                  <div className="hidden sm:block sm:col-span-1 text-right">
                    <span className="text-sm tabular-nums text-slate-700">
                      {memoCounts[t.id] ?? 0}
                    </span>
                  </div>
                </div>
                  );
                })()}
              </li>
              ))
            )}
          </ul>
        </section>
        </>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop mirrors session modals; Escape closes via document listener */}
          <div
            role="presentation"
            aria-hidden="true"
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
            onClick={closeAddModal}
          />
          <dialog
            open
            aria-labelledby="add-theme-title"
            className="relative z-10 m-0 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl outline-none open:block dark:border-slate-700 dark:bg-slate-900"
          >
            <h2
              id="add-theme-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              テーマを追加
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              追加したテーマの source は user 固定です。
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                void submitAddTheme(e);
              }}
            >
              {addFormError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {addFormError}
                </div>
              )}
              <div>
                <label
                  htmlFor="add-theme-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  テーマ名
                  <span className="text-rose-600"> *</span>
                </label>
                <input
                  id="add-theme-name"
                  type="text"
                  value={addTitle}
                  onChange={(ev) => setAddTitle(ev.target.value)}
                  maxLength={ADD_TITLE_MAX}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  autoComplete="off"
                  aria-invalid={Boolean(addFormError)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {`${addTitle.length}/${String(ADD_TITLE_MAX)} 文字`}
                </p>
              </div>
              <div>
                <label
                  htmlFor="add-theme-category"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  カテゴリ
                </label>
                <input
                  id="add-theme-category"
                  type="text"
                  value={addCategory}
                  onChange={(ev) => setAddCategory(ev.target.value)}
                  maxLength={ADD_CATEGORY_MAX}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  autoComplete="off"
                  placeholder="未入力のときは「未分類」になります"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {`${addCategory.length}/${String(ADD_CATEGORY_MAX)} 文字`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="add-theme-active"
                  type="checkbox"
                  checked={addIsActive}
                  onChange={(ev) => setAddIsActive(ev.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="add-theme-active"
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  有効にする
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAddModal}
                  disabled={addSaving}
                >
                  キャンセル
                </Button>
                <Button type="submit" isLoading={addSaving}>
                  追加
                </Button>
              </div>
            </form>
          </dialog>
        </div>
      )}

      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop mirrors session modals; Escape closes via document listener */}
          <div
            role="presentation"
            aria-hidden="true"
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
            onClick={closeEditModal}
          />
          <dialog
            open
            aria-labelledby="edit-theme-title"
            className="relative z-10 m-0 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl outline-none open:block dark:border-slate-700 dark:bg-slate-900"
          >
            <h2
              id="edit-theme-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              テーマを編集
            </h2>
            <dl className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex gap-2">
                <dt className="font-medium text-slate-500">source</dt>
                <dd>{formatSource(editingTheme.source)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-slate-500">id</dt>
                <dd className="truncate font-mono">{editingTheme.id}</dd>
              </div>
            </dl>
            {editingTheme.source === "builtin" ? (
              <p className="mt-2 text-xs text-slate-500">
                内蔵テーマも、この端末上の表示名・カテゴリ・有効状態だけ変更できます。sourceはbuiltinのままです。
              </p>
            ) : null}
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                void submitEditTheme(e);
              }}
            >
              {editFormError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {editFormError}
                </div>
              )}
              <div>
                <label
                  htmlFor="edit-theme-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  テーマ名
                  <span className="text-rose-600"> *</span>
                </label>
                <input
                  id="edit-theme-name"
                  type="text"
                  value={editTitle}
                  onChange={(ev) => setEditTitle(ev.target.value)}
                  maxLength={ADD_TITLE_MAX}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {`${editTitle.length}/${String(ADD_TITLE_MAX)} 文字`}
                </p>
              </div>
              <div>
                <label
                  htmlFor="edit-theme-category"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  カテゴリ
                </label>
                <input
                  id="edit-theme-category"
                  type="text"
                  value={editCategory}
                  onChange={(ev) => setEditCategory(ev.target.value)}
                  maxLength={ADD_CATEGORY_MAX}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  autoComplete="off"
                  placeholder="未入力のときは「未分類」になります"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {`${editCategory.length}/${String(ADD_CATEGORY_MAX)} 文字`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-theme-active"
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(ev) => setEditIsActive(ev.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="edit-theme-active"
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  有効にする
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeEditModal}
                  disabled={editSaving}
                >
                  キャンセル
                </Button>
                <Button type="submit" isLoading={editSaving}>
                  保存
                </Button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}

