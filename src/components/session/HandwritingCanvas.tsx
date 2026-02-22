"use client";

import type React from "react";
import { useEffect, useRef, useCallback } from "react";
import cc from "classcat";

export interface HandwritingCanvasProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export function HandwritingCanvas({
  value,
  onChange,
  disabled = false,
  width = 600,
  height = 300,
  className,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const logicalSizeRef = useRef({ width, height });
  // 非同期 onload 内でも常に最新の value を参照できるように ref で保持する
  const latestValueRef = useRef<string | null | undefined>(value);
  const latestCanvasDataUrlRef = useRef<string | null>(value ?? null);
  const mountedRef = useRef(true);
  const pendingImagesRef = useRef<Set<HTMLImageElement>>(new Set());

  const applyCanvasStyle = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#111827";
    },
    []
  );

  const clearCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    const logicalWidth = logicalSizeRef.current.width;
    const logicalHeight = logicalSizeRef.current.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    applyCanvasStyle(ctx);
  }, [applyCanvasStyle]);

  const drawDataUrl = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      dataUrl: string,
      options?: { enforceLatestValue?: boolean }
    ) => {
      const logicalWidth = logicalSizeRef.current.width;
      const logicalHeight = logicalSizeRef.current.height;
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
        // value 由来の再描画時のみ最新値チェックを行い、描画中リサイズの復元では無効化する。
        // latestValueRef は useRef のため .current の更新で drawDataUrl を再生成する必要はなく、
        // onload 実行時に最新値を読み取ってレースコンディションを回避できる。
        if (
          options?.enforceLatestValue !== false &&
          dataUrl !== latestValueRef.current
        ) {
          return;
        }
        clearCanvas(ctx);
        ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
        applyCanvasStyle(ctx);
      };
      img.onerror = () => {
        cleanupImage();
      };
      img.src = dataUrl;
    },
    [applyCanvasStyle, clearCanvas]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      for (const img of pendingImagesRef.current) {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }
      pendingImagesRef.current.clear();
    };
  }, []);

  // props 経由での value 更新時に描画を反映
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

  // 親要素の実測サイズに追従してキャンバスバッファを再構築（DPR対応）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const displayWidth = Math.max(1, Math.floor(rect.width));
      const displayHeight = Math.max(
        1,
        Math.floor((displayWidth * height) / width)
      );
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const inProgressDataUrl = isDrawingRef.current
        ? canvas.toDataURL("image/png")
        : null;

      logicalSizeRef.current = { width: displayWidth, height: displayHeight };

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clearCanvas(ctx);

      const restoreSource =
        inProgressDataUrl ??
        latestCanvasDataUrlRef.current ??
        latestValueRef.current ??
        null;

      if (restoreSource) {
        drawDataUrl(ctx, restoreSource, { enforceLatestValue: false });
      }
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(parent);

    return () => {
      observer.disconnect();
    };
  }, [clearCanvas, drawDataUrl, height, width]);

  const getCanvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // 表示サイズと論理サイズの比率で座標をスケーリング
    const logicalWidth = logicalSizeRef.current.width;
    const logicalHeight = logicalSizeRef.current.height;
    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;

    const { x, y } = getCanvasPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    if (!isDrawingRef.current) return;
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasPos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // dataURL エクスポートと onChange 呼び出し
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
  };

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (
    event
  ) => {
    finishDrawing(event);
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLCanvasElement> = (
    event
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
    ctx.fillRect(0, 0, logicalSizeRef.current.width, logicalSizeRef.current.height);
    applyCanvasStyle(ctx);

    latestCanvasDataUrlRef.current = null;
    onChange?.(null);
  };

  const containerClass = cc(["flex flex-col gap-2", className]);

  const canvasWrapperClass = cc([
    "relative",
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

  const clearButtonClass = cc([
    "self-end",
    "inline-flex items-center justify-center",
    "rounded-md border border-slate-300",
    "px-2 py-1 text-xs text-slate-600",
    "hover:bg-slate-50",
    "transition-colors",
    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
  ]);

  return (
    <div className={containerClass}>
      <div className={canvasWrapperClass}>
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
