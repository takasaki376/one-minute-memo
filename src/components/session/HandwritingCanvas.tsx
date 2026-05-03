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
const ERASER_PREVIEW_COLOR = "rgba(248,113,113,0.35)";

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

const average = (a: number, b: number) => (a + b) / 2;

function getSvgPathFromStroke(points: [number, number][], closed = true) {
  const len = points.length;

  if (len < 4) return "";

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2,
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1],
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(
      a[1],
      b[1],
    ).toFixed(2)} `;
  }

  if (closed) result += "Z";

  return result;
}

function getRenderableStrokePoints(points: number[][]) {
  if (points.length !== 1) return points;
  const a = points[0];
  return [a, a];
}

function getFreehandOutline(points: number[][], penSize: PenSize, last: boolean) {
  return getStroke(
    getRenderableStrokePoints(points),
    freehandOptions(penSize, last),
  ) as [number, number][];
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

type SvgStroke = {
  d: string;
  tool: "pen" | "eraser";
};

function PerfectFreehandCanvas({
  value,
  onChange,
  disabled = false,
  className,
}: HandwritingCanvasProps) {
  const [penSize, setPenSize] = useState<PenSize>("m");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [activeStrokeTool, setActiveStrokeTool] = useState<"pen" | "eraser">(
    "pen",
  );
  const [svgViewBoxSize, setSvgViewBoxSize] = useState({
    width: 1,
    height: 1,
  });
  const penSizeRef = useRef<PenSize>("m");
  const toolRef = useRef<"pen" | "eraser">("pen");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const committedStrokeLayerRef = useRef<SVGGElement | null>(null);
  const activeStrokePathRef = useRef<SVGPathElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activeStrokeStartTimeRef = useRef(0);
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
  const pendingSvgStrokesRef = useRef<SvgStroke[]>([]);
  const exportTimerIdRef = useRef<number | null>(null);
  const latestExportRequestIdRef = useRef(0);
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
      if (exportTimerIdRef.current !== null) {
        window.clearTimeout(exportTimerIdRef.current);
        exportTimerIdRef.current = null;
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
      pendingSvgStrokesRef.current = [];
      committedStrokeLayerRef.current?.replaceChildren();
      activeStrokePathRef.current?.setAttribute("d", "");
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
    pendingSvgStrokesRef.current = [];
    committedStrokeLayerRef.current?.replaceChildren();
    activeStrokePathRef.current?.setAttribute("d", "");
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
      setSvgViewBoxSize({ width: displayWidth, height: displayHeight });

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

  const getCanvasPosFromClient = useCallback((
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
  }, []);

  const getCanvasPos = useCallback((event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return getCanvasPosFromClient(canvas, event.clientX, event.clientY);
  }, [getCanvasPosFromClient]);

  const pointerPressure = useCallback((e: { pressure?: number }) => {
    const p = e.pressure;
    if (typeof p === "number" && p >= 0 && p <= 1) return p;
    return 0.5;
  }, []);

  const appendStrokeSamples = useCallback((
    canvas: HTMLCanvasElement,
    event: PointerEvent,
  ) => {
    const coalesced =
      typeof event.getCoalescedEvents === "function"
        ? event.getCoalescedEvents()
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
              pressure: pointerPressure(event),
            },
          ]
        : [
            {
              clientX: event.clientX,
              clientY: event.clientY,
              pressure: pointerPressure(event),
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
  }, [getCanvasPosFromClient, pointerPressure]);

  const updateActiveStrokePath = useCallback((last: boolean) => {
    const outline = getFreehandOutline(
      strokePointsRef.current,
      penSizeRef.current,
      last,
    );
    activeStrokePathRef.current?.setAttribute(
      "d",
      getSvgPathFromStroke(outline),
    );
  }, []);

  const clearActiveStrokePath = useCallback(() => {
    activeStrokePathRef.current?.setAttribute("d", "");
  }, []);

  const appendCommittedSvgStroke = useCallback((stroke: SvgStroke) => {
    if (!stroke.d) return;

    pendingSvgStrokesRef.current.push(stroke);

    const layer = committedStrokeLayerRef.current;
    if (!layer) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", stroke.d);
    path.setAttribute(
      "fill",
      stroke.tool === "eraser" ? ERASER_PREVIEW_COLOR : PEN_STROKE_COLOR,
    );
    path.setAttribute("stroke", "transparent");
    path.setAttribute("stroke-width", "0");
    layer.appendChild(path);
  }, []);

  const commitCurrentStrokeToSvg = useCallback(() => {
    const outline = getFreehandOutline(
      strokePointsRef.current,
      penSizeRef.current,
      true,
    );
    appendCommittedSvgStroke({
      d: getSvgPathFromStroke(outline),
      tool: toolRef.current,
    });
  }, [appendCommittedSvgStroke]);

  const clearCommittedSvgStrokes = useCallback(() => {
    pendingSvgStrokesRef.current = [];
    committedStrokeLayerRef.current?.replaceChildren();
  }, []);

  const flushCommittedSvgStrokesToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const strokes = pendingSvgStrokesRef.current;
      if (strokes.length === 0) return;
      if (typeof Path2D === "undefined") return;

      for (const stroke of strokes) {
        const path = new Path2D(stroke.d);
        ctx.globalCompositeOperation =
          stroke.tool === "eraser" ? "destination-out" : "source-over";
        ctx.fillStyle =
          stroke.tool === "eraser" ? ERASER_STROKE_COLOR : PEN_STROKE_COLOR;
        ctx.fill(path);
      }

      clearCommittedSvgStrokes();
      applyCanvasStyle(ctx);
    },
    [applyCanvasStyle, clearCommittedSvgStrokes],
  );

  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isDrawingRef.current) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    try {
      flushCommittedSvgStrokesToCanvas(ctx);
      const dataUrl = canvas.toDataURL("image/png");
      pendingLocalExportRef.current = true;
      latestCanvasDataUrlRef.current = dataUrl;
      onChange?.(dataUrl);
    } catch (e) {
      console.error("Failed to export canvas as dataURL", e);
    }

    return true;
  }, [flushCommittedSvgStrokesToCanvas, onChange]);

  const scheduleExport = useCallback(() => {
    latestExportRequestIdRef.current += 1;
    const requestId = latestExportRequestIdRef.current;

    if (exportTimerIdRef.current !== null) {
      window.clearTimeout(exportTimerIdRef.current);
    }

    const runExport = () => {
      exportTimerIdRef.current = null;
      if (requestId !== latestExportRequestIdRef.current) return;
      if (isDrawingRef.current) {
        exportTimerIdRef.current = window.setTimeout(runExport, 120);
        return;
      }
      exportCanvas();
    };

    exportTimerIdRef.current = window.setTimeout(runExport, 120);
  }, [exportCanvas]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (disabled) return;
    event.preventDefault();

    if (isDrawingRef.current) {
      if (strokePointsRef.current.length > 0) {
        commitCurrentStrokeToSvg();
      }
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      strokePointsRef.current = [];
      clearActiveStrokePath();
      scheduleExport();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    activeStrokeStartTimeRef.current = event.timeStamp;
    setActiveStrokeTool(toolRef.current);

    strokePointsRef.current = [];
    const pos = getCanvasPos(event);
    strokePointsRef.current.push([pos.x, pos.y, pointerPressure(event)]);

    applyStrokeForTool(ctx, toolRef.current, penSizeRef.current);
    updateActiveStrokePath(false);
  }, [
    clearActiveStrokePath,
    commitCurrentStrokeToSvg,
    disabled,
    getCanvasPos,
    pointerPressure,
    scheduleExport,
    updateActiveStrokePath,
  ]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (disabled) return;
    if (!isDrawingRef.current) return;

    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.timeStamp < activeStrokeStartTimeRef.current) return;
    event.preventDefault();
    // perfect-freehand のデモと同じく、複数ボタン操作だけを除外する。
    // iPad / Apple Pencil では buttons が 0 になる move があり、厳密な === 1 判定だと点を落とす。
    if (event.buttons > 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    appendStrokeSamples(canvas, event);
    updateActiveStrokePath(false);
  }, [appendStrokeSamples, disabled, updateActiveStrokePath]);

  const finishDrawing = useCallback((
    event: PointerEvent,
    options?: { export?: boolean },
  ) => {
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.timeStamp < activeStrokeStartTimeRef.current) return;
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      applyCanvasStyle(ctx);
    }

    commitCurrentStrokeToSvg();
    strokePointsRef.current = [];
    clearActiveStrokePath();

    if (options?.export !== false) {
      scheduleExport();
    }

    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      resizeFnRef.current?.();
    }
  }, [
    applyCanvasStyle,
    clearActiveStrokePath,
    commitCurrentStrokeToSvg,
    scheduleExport,
  ]);

  /**
   * ストローク終了に pointerleave は使わない。
   * iPad Safari では leave / up の順序や余計な leave が連続ストロークの pointerdown を阻害することがある。
   *
   * lostpointercapture はマウスのみ処理し、ストローク確定（エクスポートあり）に使う。
   * pen/touch では setPointerCapture を呼ばないため除外する。
   * iOS Safari が前ストロークの lostpointercapture を遅延発火させるバグがあり、
   * pen/touch で処理すると次ストロークを誤って中断させるため。
   */
  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.timeStamp < activeStrokeStartTimeRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      appendStrokeSamples(canvas, event);
    }
    finishDrawing(event, { export: true });
  }, [appendStrokeSamples, finishDrawing]);

  /**
   * pointercancel: ブラウザやシステムがポインターを強制終了した場合。
   * 描画中の SVG ストロークだけを破棄し、Canvas への確定とエクスポートは行わない。
   */
  const handlePointerCancel = useCallback((event: PointerEvent) => {
    if (!isDrawingRef.current) return;
    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.timeStamp < activeStrokeStartTimeRef.current) return;
    event.preventDefault();
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    const canvas = canvasRef.current;
    strokePointsRef.current = [];
    clearActiveStrokePath();

    const ctx = canvas?.getContext("2d");
    if (ctx) {
      applyCanvasStyle(ctx);
    }

    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      resizeFnRef.current?.();
    }
  }, [applyCanvasStyle, clearActiveStrokePath]);

  // Pointer events は React 合成イベントを経由せず、canvas の native listener で処理する。
  // perfect-freehand のデモと同じ入力モデルに寄せ、pointer capture / lostpointercapture には依存しない。
  // iPad Safari では前ストロークの lostpointercapture が次ストローク開始後に遅延発火し、
  // 同じ pointerId の新しいストロークを終了させることがある。
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    disabled,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  ]);

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

    clearActiveStrokePath();
    clearCommittedSvgStrokes();
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
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          className={canvasClass}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full touch-none select-none"
          viewBox={`0 0 ${svgViewBoxSize.width} ${svgViewBoxSize.height}`}
          preserveAspectRatio="none"
        >
          <g ref={committedStrokeLayerRef} />
          <path
            ref={activeStrokePathRef}
            d=""
            fill={
              activeStrokeTool === "eraser"
                ? ERASER_PREVIEW_COLOR
                : PEN_STROKE_COLOR
            }
            stroke="transparent"
            strokeWidth={0}
          />
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

export function HandwritingCanvas(props: HandwritingCanvasProps) {
  return <PerfectFreehandCanvas {...props} />;
}
