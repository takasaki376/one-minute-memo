"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ERASER_PREVIEW_COLOR,
  ERASER_STROKE_COLOR,
  PEN_STROKE_COLOR,
  applyStrokeForTool,
  getFreehandOutline,
  getSvgPathFromStroke,
  type PenSize,
  type SvgStroke,
} from "@/components/session/handwritingStrokeUtils";

export interface UseHandwritingCanvasEngineOptions {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function useHandwritingCanvasEngine({
  value,
  onChange,
  disabled = false,
}: UseHandwritingCanvasEngineOptions) {

  const [penSize, setPenSize] = useState<PenSize>("m");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
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

  const selectPenSize = useCallback((nextPenSize: PenSize) => {
    penSizeRef.current = nextPenSize;
    setPenSize(nextPenSize);
  }, []);

  const selectTool = useCallback((nextTool: "pen" | "eraser") => {
    toolRef.current = nextTool;
    setTool(nextTool);
  }, []);

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

  const applyActiveStrokeStyle = useCallback((nextTool: "pen" | "eraser") => {
    const path = activeStrokePathRef.current;
    if (!path) return;

    path.setAttribute(
      "fill",
      nextTool === "eraser" ? ERASER_PREVIEW_COLOR : PEN_STROKE_COLOR,
    );
    path.setAttribute("stroke", "transparent");
    path.setAttribute("stroke-width", "0");
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
    applyActiveStrokeStyle(toolRef.current);

    strokePointsRef.current = [];
    const pos = getCanvasPos(event);
    strokePointsRef.current.push([pos.x, pos.y, pointerPressure(event)]);

    applyStrokeForTool(ctx, toolRef.current, penSizeRef.current);
    updateActiveStrokePath(false);
  }, [
    clearActiveStrokePath,
    applyActiveStrokeStyle,
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
    const preventTouchDefault = (event: TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };
    const touchOptions: AddEventListenerOptions = { passive: false };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("touchstart", preventTouchDefault, touchOptions);
    canvas.addEventListener("touchmove", preventTouchDefault, touchOptions);
    canvas.addEventListener("touchend", preventTouchDefault, touchOptions);
    canvas.addEventListener("touchcancel", preventTouchDefault, touchOptions);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("touchstart", preventTouchDefault, touchOptions);
      canvas.removeEventListener("touchmove", preventTouchDefault, touchOptions);
      canvas.removeEventListener("touchend", preventTouchDefault, touchOptions);
      canvas.removeEventListener("touchcancel", preventTouchDefault, touchOptions);
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

    clearCanvas(ctx);

    clearActiveStrokePath();
    clearCommittedSvgStrokes();
    pendingLocalExportRef.current = false;
    latestCanvasDataUrlRef.current = null;
    onChange?.(null);
  };

  return {
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
  };
}
