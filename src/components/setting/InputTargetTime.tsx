"use client";

import { useState, useEffect } from "react";

export interface InputTargetTimeProps {
  value: string;
  onUpdate: (time: string) => Promise<void> | void;
  min?: number;
  max?: number;
  id?: string;
  disabled?: boolean;
  description?: string;
}

/**
 * 入力時間コンポーネント
 * 内部でローカルstate（string）を保持し、onBlur時に差分がある場合のみonUpdateを呼び出す
 */
export function InputTargetTime({
  value,
  onUpdate,
  min = 1,
  max = 3600,
  id = "time-limit",
  disabled = false,
  description = "1テーマあたりの制限時間を設定します（1〜3600秒）",
}: InputTargetTimeProps) {
  // 内部state: localTime（string）を保持
  const [localTime, setLocalTime] = useState<string>(value);

  // valueが外から変わったらlocalTimeを更新
  useEffect(() => {
    setLocalTime(value);
  }, [value]);

  // 画面表示用の数値（NaN対策）
  const displayValue = (() => {
    const num = Number.parseInt(localTime, 10);
    return Number.isNaN(num) ? "" : num;
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      // 空の場合は直前値を維持
      return;
    }

    const parsed = Number.parseInt(inputValue, 10);
    if (!Number.isNaN(parsed)) {
      // min/maxでクランプしてstring化
      const clamped = Math.max(min, Math.min(max, parsed));
      setLocalTime(String(clamped));
    }
  };

  const handleBlur = async () => {
    // valueとlocalTimeが異なる場合のみonUpdateを呼ぶ
    if (value !== localTime) {
      // クランプした結果をstring化して渡す
      const num = Number.parseInt(localTime, 10);
      if (!Number.isNaN(num)) {
        const clamped = Math.max(min, Math.min(max, num));
        try {
          await onUpdate(String(clamped));
        } catch (err) {
          // エラーは親で処理されるため、ここではログ出力のみ
          // localTimeはそのまま維持（フォームは維持）
          console.error("Failed to update time limit:", err);
        }
      }
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
      >
        入力する時間
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
        <span className="text-sm text-slate-600 dark:text-slate-400">秒</span>
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
