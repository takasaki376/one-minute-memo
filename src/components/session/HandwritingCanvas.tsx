"use client";

import type React from "react";
import { useEffect, useRef, useCallback } from "react";
import cc from "classcat";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const logicalSizeRef = useRef({ width: 0, height: 0 });
  const latestValueRef = useRef<string | null | undefined>(value);
  const latestCanvasDataUrlRef = useRef<string | null>(value ?? null);
  const mountedRef = useRef(true);
  const pendingImagesRef = useRef<Set<HTMLImageElement>>(new Set());
  const resizeRafIdRef = useRef<number | null>(null);

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
    const { width, height } = logicalSizeRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    applyCanvasStyle(ctx);
  }, [applyCanvasStyle]);

  const drawDataUrl = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      dataUrl: string,
      options?: { enforceLatestValue?: boolean }
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
    [applyCanvasStyle, clearCanvas]
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
      const rect = wrapper.getBoundingClientRect();
      const displayWidth = Math.max(1, Math.floor(rect.width));
      const displayHeight = Math.max(1, Math.floor(rect.height));
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const inProgressDataUrl = isDrawingRef.current
        ? canvas.toDataURL("image/png")
        : null;

      const prevLogical = logicalSizeRef.current;

      if (
        prevLogical.width === displayWidth &&
        prevLogical.height === displayHeight
      ) {
        return;
      }

      // 方針A: リサイズ前にオフスクリーン Canvas へ描画内容を退避
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
          0, 0, savedCanvas.width, savedCanvas.height,
          0, 0, prevW, prevH
        );
        applyCanvasStyle(ctx);
      } else {
        const restoreSource =
          inProgressDataUrl ??
          latestCanvasDataUrlRef.current ??
          latestValueRef.current ??
          null;

        if (restoreSource) {
          drawDataUrl(ctx, restoreSource, { enforceLatestValue: false });
        }
      }
    };

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
      observer.disconnect();
    };
  }, [clearCanvas, drawDataUrl, applyCanvasStyle]);

  const getCanvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { width: logicalWidth, height: logicalHeight } = logicalSizeRef.current;
    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
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
      <div ref={wrapperRef} className={canvasWrapperClass}>
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
