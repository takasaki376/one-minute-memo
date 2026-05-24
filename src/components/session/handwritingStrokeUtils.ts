import getStroke from "perfect-freehand";
import type { StrokeOptions } from "perfect-freehand";

export const PEN_WIDTHS = { s: 2, m: 4, l: 8 } as const;
export type PenSize = keyof typeof PEN_WIDTHS;

export const PEN_SIZE_LABELS: Record<PenSize, string> = {
  s: "細",
  m: "中",
  l: "太",
};

export const PEN_SIZE_ARIA_LABELS: Record<PenSize, string> = {
  s: "線の太さ 細",
  m: "線の太さ 中",
  l: "線の太さ 太",
};

export const PEN_STROKE_COLOR = "#111827";
export const ERASER_STROKE_COLOR = "rgba(0,0,0,1)";
export const ERASER_PREVIEW_COLOR = "rgba(248,113,113,0.35)";

export type SvgStroke = {
  d: string;
  tool: "pen" | "eraser";
};

export function freehandOptions(penSize: PenSize, last: boolean): StrokeOptions {
  const w = PEN_WIDTHS[penSize];
  return {
    size: Math.max(6, w * 2 + 4),
    thinning: 0.65,
    smoothing: 0.65,
    streamline: 0.65,
    simulatePressure: false,
    last,
  };
}

const average = (a: number, b: number) => (a + b) / 2;

export function getSvgPathFromStroke(points: [number, number][], closed = true) {
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

export function getFreehandOutline(
  points: number[][],
  penSize: PenSize,
  last: boolean,
) {
  return getStroke(
    getRenderableStrokePoints(points),
    freehandOptions(penSize, last),
  ) as [number, number][];
}

/** 線の見た目（結合・端・太さ・合成・色）を一箇所で設定する */
export function applyStrokeForTool(
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
