"use client";

import type React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import cc from "classcat";

const PEN_WIDTHS = { s: 2, m: 4, l: 8 } as const;
export type PenSize = keyof typeof PEN_WIDTHS;

const PEN_STROKE_COLOR = "#111827";
const ERASER_STROKE_COLOR = "rgba(0,0,0,1)";

/**
 * 線の見た目（結合・端・太さ・合成・色）を一箇所で設定する。
 * アイドル時のペン状態は tool="pen"、描画中は現在の tool を渡す。
 */
function applyStrokeForTool(
  ctx: CanvasRenderingContext2D,
  tool: "pen" | "eraser",
  penSize: PenSize,
) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = PEN_WIDTHS[penSize];
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = ERASER_STROKE_COLOR;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = PEN_STROKE_COLOR;
  }
}

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
  const [penSize, setPenSize] = useState<PenSize>("m");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const logicalSizeRef = useRef({ width: 0, height: 0 });
  const latestValueRef = useRef<string | null | undefined>(value);
  const latestCanvasDataUrlRef = useRef<string | null>(value ?? null);
  const mountedRef = useRef(true);
  const pendingImagesRef = useRef<Set<HTMLImageElement>>(new Set());
  const resizeRafIdRef = useRef<number | null>(null);
  const pendingResizeRef = useRef(false);
  const resizeFnRef = useRef<(() => void) | null>(null);

  /** 画像読み込み後・クリア後・ストローク終了後など「ペンで書き足せる状態」に戻す */
  const applyCanvasStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    applyStrokeForTool(ctx, "pen", penSize);
  }, [penSize]);

  const clearCanvas = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const { width, height } = logicalSizeRef.current;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      applyCanvasStyle(ctx);
    },
    [applyCanvasStyle],
  );

  const drawDataUrl = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      dataUrl: string,
      options?: { enforceLatestValue?: boolean },
    ) => {
      const img = new Image();
      pendingImagesRef.current.add(img);

      const cleanupImage = () => {
        img.onload = null;
        img.onerror = null;
        pendingImagesRef.current.delete(img);
      };

      img.onload = () => {
        cleanupImage();
        if (!mountedRef.current) return;
        if (
          options?.enforceLatestValue !== false &&
          dataUrl !== latestValueRef.current
        ) {
          return;
        }
        clearCanvas(ctx);
        const { width, height } = logicalSizeRef.current;
        ctx.drawImage(img, 0, 0, width, height);
        applyCanvasStyle(ctx);
      };
      img.onerror = () => {
        cleanupImage();
      };
      img.src = dataUrl;
    },
    [applyCanvasStyle, clearCanvas],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current);
        resizeRafIdRef.current = null;
      }
      for (const img of pendingImagesRef.current) {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }
      pendingImagesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    latestValueRef.current = value;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!value) {
      latestCanvasDataUrlRef.current = null;
      clearCanvas(ctx);
      return;
    }

    latestCanvasDataUrlRef.current = value;
    drawDataUrl(ctx, value);
  }, [drawDataUrl, clearCanvas, value]);

  // ResizeObserver でラッパーサイズに追従（DPR対応 + 描画保持）
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const resize = () => {
      if (isDrawingRef.current) {
        pendingResizeRef.current = true;
        return;
      }

      const displayWidth = Math.max(1, wrapper.clientWidth);
      const displayHeight = Math.max(1, wrapper.clientHeight);
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      const prevLogical = logicalSizeRef.current;

      if (
        prevLogical.width === displayWidth &&
        prevLogical.height === displayHeight
      ) {
        return;
      }

      let savedCanvas: HTMLCanvasElement | null = null;
      if (
        canvas.width > 0 &&
        canvas.height > 0 &&
        prevLogical.width > 0 &&
        prevLogical.height > 0
      ) {
        savedCanvas = document.createElement("canvas");
        savedCanvas.width = canvas.width;
        savedCanvas.height = canvas.height;
        const savedCtx = savedCanvas.getContext("2d");
        if (savedCtx) {
          savedCtx.drawImage(canvas, 0, 0);
        } else {
          savedCanvas = null;
        }
      }

      const prevW = prevLogical.width;
      const prevH = prevLogical.height;

      logicalSizeRef.current = { width: displayWidth, height: displayHeight };

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clearCanvas(ctx);

      if (savedCanvas && prevW > 0 && prevH > 0) {
        ctx.drawImage(
          savedCanvas,
          0,
          0,
          savedCanvas.width,
          savedCanvas.height,
          0,
          0,
          prevW,
          prevH,
        );
        applyCanvasStyle(ctx);
      } else {
        const restoreSource =
          latestCanvasDataUrlRef.current ?? latestValueRef.current ?? null;

        if (restoreSource) {
          drawDataUrl(ctx, restoreSource, { enforceLatestValue: false });
        }
      }
    };

    resizeFnRef.current = resize;
    resize();

    const scheduleResize = () => {
      if (resizeRafIdRef.current !== null) return;
      resizeRafIdRef.current = requestAnimationFrame(() => {
        resizeRafIdRef.current = null;
        resize();
      });
    };

    const observer = new ResizeObserver(() => {
      scheduleResize();
    });
    observer.observe(wrapper);

    return () => {
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current);
        resizeRafIdRef.current = null;
      }
      pendingResizeRef.current = false;
      resizeFnRef.current = null;
      observer.disconnect();
    };
  }, [clearCanvas, drawDataUrl, applyCanvasStyle]);

  const getCanvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { width: logicalWidth, height: logicalHeight } =
      logicalSizeRef.current;
    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const lastPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;

    applyStrokeForTool(ctx, tool, penSize);

    const pos = getCanvasPos(event);
    lastPosRef.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (!isDrawingRef.current) return;
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    applyStrokeForTool(ctx, tool, penSize);

    const pos = getCanvasPos(event);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const finishDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      latestCanvasDataUrlRef.current = dataUrl;
      onChange?.(dataUrl);
    } catch (e) {
      console.error("Failed to export canvas as dataURL", e);
    }

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      applyCanvasStyle(ctx);
    }

    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      resizeFnRef.current?.();
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    finishDrawing(event);
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    finishDrawing(event);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      0,
      0,
      logicalSizeRef.current.width,
      logicalSizeRef.current.height,
    );
    applyCanvasStyle(ctx);

    latestCanvasDataUrlRef.current = null;
    onChange?.(null);
  };

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
    disabled && "opacity-70",
  ]);

  const canvasClass = cc([
    "block",
    "rounded-md",
    "touch-none",
    disabled && "pointer-events-none",
  ]);

  const toolbarClass = cc([
    "absolute left-2 top-2 z-10",
    "hidden flex-wrap items-center gap-1.5 md:flex",
    "rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm",
  ]);

  const toolBtnClass = (active: boolean) =>
    cc([
      "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors",
      active
        ? "border-blue-500 bg-blue-50 text-blue-800"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      disabled && "pointer-events-none opacity-50",
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
      <div ref={wrapperRef} className={canvasWrapperClass}>
        <div className={toolbarClass} role="toolbar" aria-label="手書きツール">
          <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2">
            <button
              type="button"
              className={toolBtnClass(tool === "pen")}
              onClick={() => setTool("pen")}
              disabled={disabled}
              aria-label="ペン"
              aria-pressed={tool === "pen"}
            >
              ペン
            </button>
            <button
              type="button"
              className={toolBtnClass(tool === "eraser")}
              onClick={() => setTool("eraser")}
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
                className={toolBtnClass(penSize === size)}
                onClick={() => setPenSize(size)}
                disabled={disabled}
                aria-label={
                  size === "s"
                    ? "線の太さ 細い"
                    : size === "m"
                      ? "線の太さ 普通"
                      : "線の太さ 太い"
                }
                aria-pressed={penSize === size}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={canvasClass}
        />
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
