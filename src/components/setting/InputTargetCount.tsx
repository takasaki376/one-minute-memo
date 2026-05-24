"use client";

import { NumberSettingInput } from "./NumberSettingInput";

export interface InputTargetCountProps {
  value: number;
  onUpdate: (count: number) => Promise<void> | void;
  min?: number;
  max?: number;
  id?: string;
  disabled?: boolean;
  description?: string;
}

/** テーマ件数入力コンポーネント */
export function InputTargetCount({
  value,
  onUpdate,
  min = 1,
  max = 100,
  id = "theme-count",
  disabled = false,
  description = "1セッションあたりのテーマの出題数を設定します（1〜100件）",
}: InputTargetCountProps) {
  return (
    <NumberSettingInput
      id={id}
      label="テーマ件数"
      unit="件"
      value={String(value)}
      min={min}
      max={max}
      disabled={disabled}
      description={description}
      errorLogMessage="theme count"
      onUpdate={async (finalValue) => {
        await onUpdate(Number.parseInt(finalValue, 10));
      }}
    />
  );
}
