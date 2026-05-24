"use client";

import cc from "classcat";

import {
  PEN_SIZE_ARIA_LABELS,
  PEN_SIZE_LABELS,
  type PenSize,
} from "@/components/session/handwritingStrokeUtils";

export interface HandwritingToolbarProps {
  tool: "pen" | "eraser";
  penSize: PenSize;
  disabled?: boolean;
  onSelectTool: (tool: "pen" | "eraser") => void;
  onSelectPenSize: (size: PenSize) => void;
  className?: string;
}

function toolBtnClass(active: boolean, disabled?: boolean) {
  return cc([
    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors",
    active
      ? "border-blue-500 bg-blue-50 text-blue-800"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    disabled && "pointer-events-none opacity-50",
  ]);
}

export function HandwritingToolbar({
  tool,
  penSize,
  disabled = false,
  onSelectTool,
  onSelectPenSize,
  className,
}: HandwritingToolbarProps) {
  return (
    <div className={className} role="toolbar" aria-label="手書きツール">
      <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
        <button
          type="button"
          className={toolBtnClass(tool === "pen", disabled)}
          onClick={() => onSelectTool("pen")}
          disabled={disabled}
          aria-label="ペン"
          aria-pressed={tool === "pen"}
        >
          ペン
        </button>
        <button
          type="button"
          className={toolBtnClass(tool === "eraser", disabled)}
          onClick={() => onSelectTool("eraser")}
          disabled={disabled}
          aria-label="消しゴム"
          aria-pressed={tool === "eraser"}
        >
          消しゴム
        </button>
      </div>
      <div className="flex items-center gap-0.5">
        {(["s", "m", "l"] as const).map((size) => (
          <button
            key={size}
            type="button"
            className={toolBtnClass(penSize === size, disabled)}
            onClick={() => onSelectPenSize(size)}
            disabled={disabled}
            aria-label={PEN_SIZE_ARIA_LABELS[size]}
            aria-pressed={penSize === size}
          >
            {PEN_SIZE_LABELS[size]}
          </button>
        ))}
      </div>
    </div>
  );
}
