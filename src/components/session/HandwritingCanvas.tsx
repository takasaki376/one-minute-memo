"use client";

import type React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import cc from "classcat";
import getStroke from "perfect-freehand";
import type { StrokeOptions } from "perfect-freehand";

const PEN_WIDTHS = { s: 2, m: 4, l: 8 } as const;
export type PenSize = keyof typeof PEN_WIDTHS;

const PEN_SIZE_LABELS: Record<PenSize, string> = {
  s: "細",
  m: "中",
  l: "太",
};

const PEN_SIZE_ARIA_LABELS: Record<PenSize, string> = {
  s: "線の太さ 細",
  m: "線の太さ 中",
  l: "線の太さ 太",
};

const PEN_STROKE_COLOR = "#111827";
const ERASER_STROKE_COLOR = "rgba(0,0,0,1)";

function freehandOptions(penSize: PenSize, last: boolean): StrokeOptions {
  const w = PEN_WIDTHS[penSize];
  return {
    size: Math.max(6, w * 2 + 4),
    thinning: 0.65,
    smoothing: 0.65,
    streamline: 0.65,
    // Prefer real stylus pressure when available.
    simulatePressure: false,
    last,
  };
}

function fillFreehandOutline(
  ctx: CanvasRenderingContext2D,
  outline: [number, number][],
  tool: "pen" | "eraser",
) {
  if (outline.length < 2) return;
  ctx.globalCompositeOperation =
    tool === "eraser" ? "destination-out" : "source-over";
  ctx.fillStyle = tool === "eraser" ? ERASER_STROKE_COLOR : PEN_STROKE_COLOR;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

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
  const penSizeRef = useRef<PenSize>("m");
  const toolRef = useRef<"pen" | "eraser">("pen");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const logicalSizeRef = useRef({ width: 0, height: 0 });
  const dprRef = useRef(1);
  const latestValueRef = useRef<string | null | undefined>(value);
  const latestCanvasDataUrlRef = useRef<string | null>(value ?? null);
  const mountedRef = useRef(true);
  const pendingImagesRef = useRef<Set<HTMLImageElement>>(new Set());
  const resizeRafIdRef = useRef<number | null>(null);
  const pendingResizeRef = useRef(false);
  const resizeFnRef = useRef<(() => void) | null>(null);
  /** perfect-freehand 用: 現在ストロークの [x, y, pressure?]（論理座標） */
  const strokePointsRef = useRef<number[][]>([]);
  /** ストローク開始直前のキャンバス（device px）— move では drawImage で復元する */
  const beforeStrokeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  /** ストローク描画を rAF で 1 フレームにまとめる */
  const strokeRafIdRef = useRef<number | null>(null);
  const strokeLastFlagRef = useRef(false);
  /** 直近の onChange がローカル描画の反映であるとき、親からの同じ value で二重デコード・全貼り直しを避ける */
  const pendingLocalExportRef = useRef(false);

  useEffect(() => {
    penSizeRef.current = penSize;
  }, [penSize]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  /** 画像読み込み後・クリア後・ストローク終了後など「ペンで書き足せる状態」に戻す */
  const applyCanvasStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    applyStrokeForTool(ctx, "pen", penSizeRef.current);
  }, []);

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
    const pendingImages = pendingImagesRef.current;

    return () => {
      mountedRef.current = false;
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current);
        resizeRafIdRef.current = null;
      }
      for (const img of pendingImages) {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }
      pendingImages.clear();
    };
  }, []);

  useEffect(() => {
    latestValueRef.current = value;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!value) {
      pendingLocalExportRef.current = false;
      latestCanvasDataUrlRef.current = null;
      clearCanvas(ctx);
      return;
    }

    if (
      pendingLocalExportRef.current &&
      value === latestCanvasDataUrlRef.current
    ) {
      pendingLocalExportRef.current = false;
      return;
    }

    pendingLocalExportRef.current = false;
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
      dprRef.current = dpr;

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

  /** iOS Safari がスクロール等でポインターを奪うのを抑止（passive: false が必要） */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      // pen には preventDefault() を呼ばない。
      // touch-action: none で十分であり、pen で preventDefault() を呼ぶと
      // Safari で後続の pointermove 配信に影響するケースがある。
      if (e.pointerType === "touch") {
        e.preventDefault();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDownCapture, {
      passive: false,
      capture: true,
    });
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [disabled]);

  const getCanvasPosFromClient = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const { width: logicalWidth, height: logicalHeight } =
      logicalSizeRef.current;
    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getCanvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return getCanvasPosFromClient(canvas, event.clientX, event.clientY);
  };

  const pointerPressure = (e: { pressure?: number }) => {
    const p = e.pressure;
    if (typeof p === "number" && p >= 0 && p <= 1) return p;
    return 0.5;
  };

  const appendStrokeSamples = (
    canvas: HTMLCanvasElement,
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const native = event.nativeEvent;
    const coalesced =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [];
    const samples: { clientX: number; clientY: number; pressure: number }[] =
      coalesced.length > 0
        ? [
            ...coalesced.map((e) => ({
              clientX: e.clientX,
              clientY: e.clientY,
              pressure: pointerPressure(e),
            })),
            {
              clientX: event.clientX,
              clientY: event.clientY,
              pressure: pointerPressure(event.nativeEvent),
            },
          ]
        : [
            {
              clientX: event.clientX,
              clientY: event.clientY,
              pressure: pointerPressure(event.nativeEvent),
            },
          ];

    for (const sample of samples) {
      const pos = getCanvasPosFromClient(
        canvas,
        sample.clientX,
        sample.clientY,
      );
      strokePointsRef.current.push([pos.x, pos.y, sample.pressure]);
    }
  };

  const redrawCurrentStroke = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    last: boolean,
  ) => {
    const snapshotCanvas = beforeStrokeCanvasRef.current;
    if (!snapshotCanvas) return;

    // Snapshot を復元（現在の transform 無視して device px で描画）
    const dpr = dprRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(snapshotCanvas, 0, 0);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ストロークを描画（論理座標系で）
    let points = strokePointsRef.current;
    if (points.length === 0) return;
    if (points.length === 1) {
      const a = points[0];
      points = [a, a];
    }

    const outline = getStroke(
      points,
      freehandOptions(penSizeRef.current, last),
    ) as [number, number][];
    fillFreehandOutline(ctx, outline, toolRef.current);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (disabled) return;
    // 再入防止: 描画中に別の pointerdown が来ても無視する
    if (isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Prepare snapshot first to avoid entering a partial drawing state.
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    const snapshotCtx = snapshot.getContext("2d");
    if (!snapshotCtx) return;
    snapshotCtx.drawImage(canvas, 0, 0);
    beforeStrokeCanvasRef.current = snapshot;

    // iPad Safari + Apple Pencil の既知バグ:
    // pen / touch に対して setPointerCapture を呼ぶと即座に pointercancel が発火し、
    // recovery → setPointerCapture → pointercancel の無限ループになる。
    // マウスのみ setPointerCapture を使い、pen / touch はブラウザのデフォルト配送に委ねる。
    if (event.nativeEvent.pointerType === "mouse") {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // noop
      }
    }
    isDrawingRef.current = true;
    activePointerIdRef.current = event.pointerId;

    strokePointsRef.current = [];
    const pos = getCanvasPos(event);
    strokePointsRef.current.push([
      pos.x,
      pos.y,
      pointerPressure(event.nativeEvent),
    ]);

    applyStrokeForTool(ctx, toolRef.current, penSizeRef.current);

    redrawCurrentStroke(ctx, canvas, false);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (disabled) return;

    // iPad / Apple Pencil: pointerdown が届かなかった場合の回復処理。
    // Safari では Apple Pencil の buttons が 0 になる既知バグがあるため、
    // pressure > 0 を補完条件として接触を判定する。
    if (!isDrawingRef.current) {
      const native = event.nativeEvent;
      const isContact =
        native.buttons !== 0 ||
        (native.pointerType !== "mouse" &&
          typeof native.pressure === "number" &&
          native.pressure > 0);
      if (isContact) {
        handlePointerDown(event);
      }
      return;
    }

    if (activePointerIdRef.current !== event.pointerId) return;
    // マルチタッチ / ジェスチャーによる余計な move をガード（デモサイト準拠）
    if (event.nativeEvent.buttons > 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    appendStrokeSamples(canvas, event);
    strokeLastFlagRef.current = false;
    if (strokeRafIdRef.current !== null) return;
    strokeRafIdRef.current = requestAnimationFrame(() => {
      strokeRafIdRef.current = null;
      const c = canvasRef.current;
      if (!c) return;
      const cctx = c.getContext("2d");
      if (!cctx) return;
      redrawCurrentStroke(cctx, c, strokeLastFlagRef.current);
    });
  };

  const finishDrawing = (
    event: React.PointerEvent<HTMLCanvasElement>,
    options?: { export?: boolean },
  ) => {
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    isDrawingRef.current = false;
    activePointerIdRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }

    const ctx = canvas.getContext("2d");
    if (strokeRafIdRef.current !== null) {
      cancelAnimationFrame(strokeRafIdRef.current);
      strokeRafIdRef.current = null;
    }
    if (ctx && beforeStrokeCanvasRef.current) {
      redrawCurrentStroke(ctx, canvas, true);
    }
    beforeStrokeCanvasRef.current = null;
    strokePointsRef.current = [];

    if (options?.export !== false) {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        pendingLocalExportRef.current = true;
        latestCanvasDataUrlRef.current = dataUrl;
        onChange?.(dataUrl);
      } catch (e) {
        console.error("Failed to export canvas as dataURL", e);
      }
    }

    if (ctx) {
      applyCanvasStyle(ctx);
    }

    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      resizeFnRef.current?.();
    }
  };

  /**
   * ストローク終了に pointerleave は使わない。
   * iPad Safari では leave / up の順序や余計な leave が連続ストロークの pointerdown を阻害することがある。
   * lostpointercapture は「描画の確定」には使わず、取りこぼし対策として状態リセットのみ行う。
   */
  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    const canvas = canvasRef.current;
    if (canvas) {
      appendStrokeSamples(canvas, event);
    }
    finishDrawing(event, { export: true });
  };

  /**
   * pointercancel: ブラウザやシステムがポインターを強制終了した場合。
   * setPointerCapture 直後に iPad Safari が pointercancel を発火するケースへの対策。
   * 描画途中のストロークをスナップショットで巻き戻し、エクスポートは行わない。
   */
  const handlePointerCancel: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;

    isDrawingRef.current = false;
    activePointerIdRef.current = null;

    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }

    if (strokeRafIdRef.current !== null) {
      cancelAnimationFrame(strokeRafIdRef.current);
      strokeRafIdRef.current = null;
    }

    // キャンセルされたストロークをスナップショットで巻き戻す
    const canvas = canvasRef.current;
    const snapshotCanvas = beforeStrokeCanvasRef.current;
    if (canvas && snapshotCanvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = dprRef.current;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(snapshotCanvas, 0, 0);
        ctx.restore();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    beforeStrokeCanvasRef.current = null;
    strokePointsRef.current = [];

    const ctx = canvas?.getContext("2d");
    if (ctx) {
      applyCanvasStyle(ctx);
    }

    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      resizeFnRef.current?.();
    }
  };

  const handleLostPointerCapture: React.PointerEventHandler<
    HTMLCanvasElement
  > = (event) => {
    // pen/touch では setPointerCapture を呼ばないため、本来 lostpointercapture は発火しない。
    // しかし iOS Safari は暗黙的にキャプチャし、前ストロークの lostpointercapture を
    // 遅延発火させることがある。Apple Pencil は常に同じ pointerId を使うため、
    // 遅延発火が次ストロークを中断させる。pen/touch では lostpointercapture を無視する。
    if (event.nativeEvent.pointerType !== "mouse") return;
    finishDrawing(event, { export: true });
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

    pendingLocalExportRef.current = false;
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
            {tool === "pen" ? (
              <button
                type="button"
                className={toolBtnClass(true)}
                onClick={() => setTool("pen")}
                disabled={disabled}
                aria-label="ペン"
                aria-pressed="true"
              >
                ペン
              </button>
            ) : (
              <button
                type="button"
                className={toolBtnClass(false)}
                onClick={() => setTool("pen")}
                disabled={disabled}
                aria-label="ペン"
                aria-pressed="false"
              >
                ペン
              </button>
            )}
            {tool === "eraser" ? (
              <button
                type="button"
                className={toolBtnClass(true)}
                onClick={() => setTool("eraser")}
                disabled={disabled}
                aria-label="消しゴム"
                aria-pressed="true"
              >
                消しゴム
              </button>
            ) : (
              <button
                type="button"
                className={toolBtnClass(false)}
                onClick={() => setTool("eraser")}
                disabled={disabled}
                aria-label="消しゴム"
                aria-pressed="false"
              >
                消しゴム
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {(["s", "m", "l"] as const).map((size) =>
              penSize === size ? (
                <button
                  key={size}
                  type="button"
                  className={toolBtnClass(true)}
                  onClick={() => setPenSize(size)}
                  disabled={disabled}
                  aria-label={PEN_SIZE_ARIA_LABELS[size]}
                  aria-pressed="true"
                >
                  {PEN_SIZE_LABELS[size]}
                </button>
              ) : (
                <button
                  key={size}
                  type="button"
                  className={toolBtnClass(false)}
                  onClick={() => setPenSize(size)}
                  disabled={disabled}
                  aria-label={PEN_SIZE_ARIA_LABELS[size]}
                  aria-pressed="false"
                >
                  {PEN_SIZE_LABELS[size]}
                </button>
              ),
            )}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
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
