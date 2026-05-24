"use client";

import { useEffect, useState, type ChangeEvent } from "react";

export interface NumberSettingInputProps {
  id: string;
  label: string;
  unit: string;
  value: string;
  onUpdate: (value: string) => Promise<void> | void;
  min?: number;
  max?: number;
  disabled?: boolean;
  description?: string;
  errorLogMessage?: string;
}

/**
 * 数値設定入力（blur 時に min/max でクランプして onUpdate）
 */
export function NumberSettingInput({
  id,
  label,
  unit,
  value,
  onUpdate,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  description,
  errorLogMessage = "setting value",
}: NumberSettingInputProps) {
  const [inputValue, setInputValue] = useState<string>(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const displayValue = (() => {
    if (inputValue === "") return "";
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) return "";
    return parsed;
  })();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue === "") {
      setInputValue("");
      return;
    }

    const parsed = Number.parseInt(newValue, 10);
    if (!Number.isNaN(parsed)) {
      setInputValue(newValue);
    }
  };

  const handleBlur = async () => {
    let finalValue: string;
    if (inputValue === "") {
      finalValue = String(min);
      setInputValue(String(min));
    } else {
      const parsed = Number.parseInt(inputValue, 10);
      if (Number.isNaN(parsed)) {
        finalValue = String(min);
        setInputValue(String(min));
      } else {
        const clamped = Math.max(min, Math.min(max, parsed));
        finalValue = String(clamped);
        setInputValue(String(clamped));
      }
    }

    if (value !== finalValue) {
      try {
        await onUpdate(finalValue);
      } catch (err) {
        console.error(`Failed to update ${errorLogMessage}:`, err);
      }
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
      >
        {label}
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
        <span className="text-sm text-slate-600 dark:text-slate-400">{unit}</span>
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
