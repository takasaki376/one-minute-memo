import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { HandwritingCanvas } from "../HandwritingCanvas";

function createMock2dContext() {
  return {
    canvas: document.createElement("canvas"),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn(),
    lineJoin: "",
    lineCap: "",
    lineWidth: 0,
    strokeStyle: "",
    fillStyle: "",
    globalCompositeOperation: "source-over",
  };
}

describe("HandwritingCanvas", () => {
  let mockCtx: ReturnType<typeof createMock2dContext>;

  beforeEach(() => {
    mockCtx = createMock2dContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement, type: string) {
        if (type !== "2d") return null;
        mockCtx.canvas = this;
        return mockCtx as unknown as CanvasRenderingContext2D;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,xx",
    );

    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function getCanvas(container: HTMLElement): HTMLCanvasElement {
    const el = container.querySelector("canvas");
    if (!el) {
      throw new Error("Expected canvas element");
    }
    return el;
  }

  function setupCanvasForPointer(canvas: HTMLCanvasElement) {
    canvas.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
  }

  it("初期状態で太さ「中」が選択されている（aria-pressed）", () => {
    render(<HandwritingCanvas onChange={vi.fn()} />);

    expect(screen.getByLabelText("線の太さ 中")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("線の太さ 細")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("細／中／太 を切り替えると aria-pressed が切り替わる", () => {
    render(<HandwritingCanvas onChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("線の太さ 細"));
    expect(screen.getByLabelText("線の太さ 細")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByLabelText("線の太さ 太"));
    expect(screen.getByLabelText("線の太さ 太")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("pointerdown で lineWidth が選択中の太さに設定される", async () => {
    const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    fireEvent.click(screen.getByLabelText("線の太さ 太"));

    await act(async () => {
      fireEvent.pointerDown(canvas, {
        clientX: 10,
        clientY: 10,
        pointerId: 1,
        buttons: 1,
      });
    });

    expect(mockCtx.lineWidth).toBe(8);
    expect(mockCtx.globalCompositeOperation).toBe("source-over");
  });

  it("初期はペン（pen）が選択され、消しゴムに切り替えられる", () => {
    render(<HandwritingCanvas onChange={vi.fn()} />);

    expect(screen.getByLabelText("ペン")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("消しゴム")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByLabelText("消しゴム"));
    expect(screen.getByLabelText("消しゴム")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByLabelText("ペン"));
    expect(screen.getByLabelText("ペン")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("消しゴム選択時の pointerdown で globalCompositeOperation が destination-out になる", async () => {
    const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    fireEvent.click(screen.getByLabelText("消しゴム"));

    await act(async () => {
      fireEvent.pointerDown(canvas, {
        clientX: 5,
        clientY: 5,
        pointerId: 2,
        buttons: 1,
      });
    });

    expect(mockCtx.globalCompositeOperation).toBe("destination-out");
    expect(mockCtx.lineWidth).toBe(4);
  });

  it("ストローク終了後は idle 用に globalCompositeOperation が source-over に戻る", async () => {
    const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    fireEvent.click(screen.getByLabelText("消しゴム"));

    await act(async () => {
      fireEvent.pointerDown(canvas, {
        clientX: 5,
        clientY: 5,
        pointerId: 3,
        buttons: 1,
      });
      fireEvent.pointerUp(canvas, {
        clientX: 5,
        clientY: 5,
        pointerId: 3,
        buttons: 0,
      });
    });

    expect(mockCtx.globalCompositeOperation).toBe("source-over");
  });
});
