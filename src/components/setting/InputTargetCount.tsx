"use client";

import { useState, useEffect } from "react";

export interface InputTargetCountProps {
  value: number;
  onUpdate: (count: number) => Promise<void> | void;
  min?: number;
  max?: number;
  id?: string;
  disabled?: boolean;
  description?: string;
}

/**
 * テーマ件数入力コンポーネント
 * 内部でローカルstateを保持し、onBlur時に差分がある場合のみonUpdateを呼び出す
 */
export function InputTargetCount({
  value,
  onUpdate,
  min = 1,
  max = 100,
  id = "theme-count",
  disabled = false,
  description = "1セッションあたりのテーマの出題数を設定します（1〜100件）",
}: InputTargetCountProps) {
  const [localCount, setLocalCount] = useState<number>(value);

  // valueが外から変わったらlocalCountを更新
  useEffect(() => {
    setLocalCount(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      // 空の場合は直前値を維持
      return;
    }

    const parsed = Number.parseInt(inputValue, 10);
    if (!Number.isNaN(parsed)) {
      // min/maxでクランプ
      const clamped = Math.max(min, Math.min(max, parsed));
      setLocalCount(clamped);
    }
  };

  const handleBlur = async () => {
    // valueとlocalCountが異なる場合のみonUpdateを呼ぶ
    if (value !== localCount) {
      // クランプした値を渡す
      const clamped = Math.max(min, Math.min(max, localCount));
      try {
        await onUpdate(clamped);
      } catch (err) {
        // エラーは親で処理されるため、ここではログ出力のみ
        // localCountはそのまま維持（フォームは維持）
        console.error("Failed to update theme count:", err);
      }
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
      >
        テーマ件数
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={1}
          value={localCount}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-24 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby={description ? `${id}-description` : undefined}
        />
        <span className="text-sm text-slate-600 dark:text-slate-400">件</span>
      </div>
      {description && (
        <p
          id={`${id}-description`}
          className="mt-1 text-xs text-slate-500 dark:text-slate-400"
        >
          {description}
        </p>
      )}
    </div>
  );
}
