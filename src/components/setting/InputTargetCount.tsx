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
  // 入力中の値を文字列として保持（空文字も許可）
  const [inputValue, setInputValue] = useState<string>(String(value));

  // valueが外から変わったらinputValueを更新
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  // 表示用の値（空文字の場合は空文字、数値の場合は数値）
  const displayValue = (() => {
    if (inputValue === "") return "";
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) return "";
    return parsed;
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // 空文字を許可（ユーザーが値をクリアできるようにする）
    if (newValue === "") {
      setInputValue("");
      return;
    }

    const parsed = Number.parseInt(newValue, 10);
    if (!Number.isNaN(parsed)) {
      // 入力中はクランプせず、そのまま表示（blur時にクランプ）
      setInputValue(newValue);
    }
  };

  const handleBlur = async () => {
    // 空文字の場合は最小値にフォールバック
    let finalValue: number;
    if (inputValue === "") {
      finalValue = min;
      setInputValue(String(min));
    } else {
      const parsed = Number.parseInt(inputValue, 10);
      if (Number.isNaN(parsed)) {
        // パースできない場合は最小値にフォールバック
        finalValue = min;
        setInputValue(String(min));
      } else {
        // min/maxでクランプ
        finalValue = Math.max(min, Math.min(max, parsed));
        setInputValue(String(finalValue));
      }
    }

    // valueとfinalValueが異なる場合のみonUpdateを呼ぶ
    if (value !== finalValue) {
      try {
        await onUpdate(finalValue);
      } catch (err) {
        // エラーは親で処理されるため、ここではログ出力のみ
        // inputValueはそのまま維持（フォームは維持）
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
          value={displayValue}
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
