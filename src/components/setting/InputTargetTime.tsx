"use client";

import { NumberSettingInput } from "./NumberSettingInput";

export interface InputTargetTimeProps {
  value: string;
  onUpdate: (time: string) => Promise<void> | void;
  min?: number;
  max?: number;
  id?: string;
  disabled?: boolean;
  description?: string;
}

/** 入力時間コンポーネント */
export function InputTargetTime({
  value,
  onUpdate,
  min = 1,
  max = 3600,
  id = "time-limit",
  disabled = false,
  description = "1テーマあたりの制限時間を設定します（1〜3600秒）",
}: InputTargetTimeProps) {
  return (
    <NumberSettingInput
      id={id}
      label="入力する時間"
      unit="秒"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      description={description}
      errorLogMessage="time limit"
      onUpdate={onUpdate}
    />
  );
}
