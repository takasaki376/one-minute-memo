"use client";

import cc from "classcat";

import { HandwritingToolbar } from "@/components/session/HandwritingToolbar";
import { useHandwritingCanvasEngine } from "@/components/session/useHandwritingCanvasEngine";

export type { PenSize } from "@/components/session/handwritingStrokeUtils";

export interface HandwritingCanvasProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function HandwritingCanvas({
  value,
  onChange,
  disabled = false,
  className,
}: HandwritingCanvasProps) {
  const {
    canvasRef,
    wrapperRef,
    committedStrokeLayerRef,
    activeStrokePathRef,
    svgViewBoxSize,
    penSize,
    tool,
    selectPenSize,
    selectTool,
    handleClear,
  } = useHandwritingCanvasEngine({ value, onChange, disabled });

  const containerClass = cc(["flex flex-col gap-2", className]);

  const canvasWrapperClass = cc([
    "relative",
    "flex-1",
    "min-h-0",
    "overflow-hidden",
    "rounded-md",
    "border",
    "border-slate-300",
    "bg-white",
    "select-none",
    "touch-none",
    "[-webkit-touch-callout:none]",
    disabled && "opacity-70",
  ]);

  const canvasClass = cc([
    "block",
    "rounded-md",
    "touch-none",
    "select-none",
    "[-webkit-touch-callout:none]",
    disabled && "pointer-events-none",
  ]);

  const toolbarClass = cc([
    "absolute left-2 top-2 z-10",
    "select-none",
    "hidden flex-wrap items-center gap-1.5 md:flex",
    "rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm",
  ]);

  const clearButtonClass = cc([
    "self-end",
    "inline-flex items-center justify-center",
    "rounded-md border border-slate-300",
    "px-2 py-1 text-xs text-slate-600",
    "hover:bg-slate-50",
    "transition-colors",
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
  ]);

  return (
    <div className={containerClass}>
      <div
        ref={wrapperRef}
        className={canvasWrapperClass}
        style={{
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <HandwritingToolbar
          className={toolbarClass}
          tool={tool}
          penSize={penSize}
          disabled={disabled}
          onSelectTool={selectTool}
          onSelectPenSize={selectPenSize}
        />
        <canvas
          ref={canvasRef}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          className={canvasClass}
          style={{
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full touch-none select-none"
          style={{
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          viewBox={`0 0 ${svgViewBoxSize.width} ${svgViewBoxSize.height}`}
          preserveAspectRatio="none"
        >
          <g ref={committedStrokeLayerRef} />
          <path ref={activeStrokePathRef} />
        </svg>
      </div>
      <button
        type="button"
        onClick={handleClear}
        className={clearButtonClass}
        disabled={disabled}
      >
        クリア
      </button>
    </div>
  );
}
