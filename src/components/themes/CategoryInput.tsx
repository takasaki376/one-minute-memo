"use client";

export interface CategoryInputProps {
  idPrefix: string;
  categories: string[];
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  customCategory: string;
  onCustomCategoryChange: (value: string) => void;
  maxLength: number;
  disabled?: boolean;
}

/**
 * 既存カテゴリのプルダウンと新規カテゴリ入力を併用するフィールド
 */
export function CategoryInput({
  idPrefix,
  categories,
  selectedCategory,
  onSelectedCategoryChange,
  customCategory,
  onCustomCategoryChange,
  maxLength,
  disabled = false,
}: CategoryInputProps) {
  const selectId = `${idPrefix}-category-select`;
  const customId = `${idPrefix}-category-custom`;
  const usingExisting = selectedCategory.length > 0;

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          カテゴリ（既存から選択）
        </label>
        <select
          id={selectId}
          value={selectedCategory}
          disabled={disabled}
          onChange={(e) => {
            onSelectedCategoryChange(e.target.value);
            if (e.target.value.length > 0) {
              onCustomCategoryChange("");
            }
          }}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="">選択してください</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <p className="text-center text-xs text-slate-500">または</p>
      <div>
        <label
          htmlFor={customId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          新規カテゴリ
        </label>
        <input
          id={customId}
          type="text"
          value={customCategory}
          disabled={disabled || usingExisting}
          onChange={(e) => {
            onCustomCategoryChange(e.target.value);
            if (e.target.value.length > 0) {
              onSelectedCategoryChange("");
            }
          }}
          maxLength={maxLength}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
          autoComplete="off"
          placeholder="未入力のときは「未分類」になります"
        />
        <p className="mt-1 text-xs text-slate-500">
          {`${customCategory.length}/${String(maxLength)} 文字`}
        </p>
      </div>
    </div>
  );
}

export function resolveCategoryValue(
  selectedCategory: string,
  customCategory: string,
): string {
  if (selectedCategory.length > 0) return selectedCategory;
  return customCategory;
}
