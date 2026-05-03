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
    fill: vi.fn(),
    closePath: vi.fn(),
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

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
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
    canvas.width = 400;
    canvas.height = 300;
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

  function getActiveStrokePath(container: HTMLElement): SVGPathElement | null {
    return container.querySelector("svg path");
  }

  function getActiveStrokePathData(container: HTMLElement): string {
    return getActiveStrokePath(container)?.getAttribute("d") ?? "";
  }

  function dispatchPointerEvent(
    target: HTMLElement,
    type: string,
    init: {
      clientX: number;
      clientY: number;
      pointerId: number;
      buttons: number;
      timeStamp: number;
      pointerType?: string;
    },
  ) {
    const event = new MouseEvent(type, {
      bubbles: true,
      clientX: init.clientX,
      clientY: init.clientY,
      buttons: init.buttons,
    });
    Object.defineProperty(event, "pointerId", { value: init.pointerId });
    Object.defineProperty(event, "pointerType", {
      value: init.pointerType ?? "pen",
    });
    Object.defineProperty(event, "timeStamp", { value: init.timeStamp });
    target.dispatchEvent(event as unknown as PointerEvent);
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
    expect(mockCtx.fill).not.toHaveBeenCalled();
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
    expect(mockCtx.fill).not.toHaveBeenCalled();
  });

  it("pointermove で Canvas に焼き込まず SVG path を更新する", async () => {
    const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    await act(async () => {
      const down = new MouseEvent("pointerdown", {
        bubbles: true,
        clientX: 10,
        clientY: 10,
        buttons: 1,
      });
      Object.defineProperty(down, "pointerId", { value: 10 });
      Object.defineProperty(down, "pointerType", { value: "mouse" });
      canvas.dispatchEvent(down as unknown as PointerEvent);
      mockCtx.drawImage.mockClear();
      mockCtx.fill.mockClear();
      const move = new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 20,
        clientY: 20,
        buttons: 1,
      });
      Object.defineProperty(move, "pointerId", { value: 10 });
      Object.defineProperty(move, "pointerType", { value: "mouse" });
      canvas.dispatchEvent(move as unknown as PointerEvent);
    });

    expect(mockCtx.drawImage).not.toHaveBeenCalled();
    expect(mockCtx.fill).not.toHaveBeenCalled();
    expect(getActiveStrokePathData(container)).toContain("M");
  });

  it("pointermove は Apple Pencil 対策として buttons: 0 でも SVG path の更新を継続する", async () => {
    const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    await act(async () => {
      fireEvent.pointerDown(canvas, {
        clientX: 10,
        clientY: 10,
        pointerId: 10,
        buttons: 1,
      });
    });

    mockCtx.drawImage.mockClear();
    mockCtx.fill.mockClear();

    await act(async () => {
      fireEvent.pointerMove(canvas, {
        clientX: 20,
        clientY: 20,
        pointerId: 10,
        buttons: 0,
      });
    });

    expect(mockCtx.drawImage).not.toHaveBeenCalled();
    expect(mockCtx.fill).not.toHaveBeenCalled();
    expect(getActiveStrokePathData(container)).toContain("M");
  });

  it("前ストローク由来の lostpointercapture が遅延発火しても次ストロークを終了しない", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<HandwritingCanvas onChange={onChange} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    await act(async () => {
      fireEvent.pointerDown(canvas, {
        clientX: 10,
        clientY: 10,
        pointerId: 1,
        buttons: 1,
      });
      fireEvent.pointerUp(canvas, {
        clientX: 10,
        clientY: 10,
        pointerId: 1,
        buttons: 0,
      });
    });

    onChange.mockClear();

    await act(async () => {
      fireEvent.pointerDown(canvas, {
        clientX: 20,
        clientY: 20,
        pointerId: 1,
        buttons: 1,
      });
      fireEvent(
        canvas,
        new Event("lostpointercapture", { bubbles: true }),
      );
      fireEvent.pointerMove(canvas, {
        clientX: 30,
        clientY: 30,
        pointerId: 1,
        buttons: 1,
      });
    });

    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.pointerUp(canvas, {
        clientX: 30,
        clientY: 30,
        pointerId: 1,
        buttons: 0,
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("前ストローク由来の遅延 pointerup が次ストロークを終了しない", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<HandwritingCanvas onChange={onChange} />);
    const canvas = getCanvas(container);
    setupCanvasForPointer(canvas);

    await act(async () => {
      dispatchPointerEvent(canvas, "pointerdown", {
        clientX: 10,
        clientY: 10,
        pointerId: 1,
        buttons: 1,
        timeStamp: 100,
      });
      dispatchPointerEvent(canvas, "pointermove", {
        clientX: 20,
        clientY: 20,
        pointerId: 1,
        buttons: 1,
        timeStamp: 110,
      });
      dispatchPointerEvent(canvas, "pointerdown", {
        clientX: 30,
        clientY: 30,
        pointerId: 1,
        buttons: 1,
        timeStamp: 200,
      });
      dispatchPointerEvent(canvas, "pointerup", {
        clientX: 20,
        clientY: 20,
        pointerId: 1,
        buttons: 0,
        timeStamp: 150,
      });
      dispatchPointerEvent(canvas, "pointermove", {
        clientX: 40,
        clientY: 40,
        pointerId: 1,
        buttons: 1,
        timeStamp: 210,
      });
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(getActiveStrokePathData(container)).toContain("M");

    await act(async () => {
      dispatchPointerEvent(canvas, "pointerup", {
        clientX: 40,
        clientY: 40,
        pointerId: 1,
        buttons: 0,
        timeStamp: 220,
      });
      vi.advanceTimersByTime(120);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
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

  describe("pointercancel の処理", () => {
    it("pointercancel では onChange が呼ばれない（エクスポートしない）", async () => {
      const onChange = vi.fn();
      const { container } = render(<HandwritingCanvas onChange={onChange} />);
      const canvas = getCanvas(container);
      setupCanvasForPointer(canvas);

      await act(async () => {
        fireEvent.pointerDown(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
          buttons: 1,
        });
      });
      onChange.mockClear();

      await act(async () => {
        fireEvent.pointerCancel(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        });
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it("pointercancel で SVG の描画中ストロークを破棄する", async () => {
      const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
      const canvas = getCanvas(container);
      setupCanvasForPointer(canvas);

      await act(async () => {
        fireEvent.pointerDown(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
          buttons: 1,
        });
        fireEvent.pointerMove(canvas, {
          clientX: 20,
          clientY: 20,
          pointerId: 1,
          buttons: 1,
        });
      });

      expect(getActiveStrokePathData(container)).toContain("M");
      mockCtx.drawImage.mockClear();

      await act(async () => {
        fireEvent.pointerCancel(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        });
      });

      expect(mockCtx.drawImage).not.toHaveBeenCalled();
      expect(getActiveStrokePathData(container)).toBe("");
    });

    it("pointercancel 後は globalCompositeOperation が source-over（idle 状態）に戻る", async () => {
      const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
      const canvas = getCanvas(container);
      setupCanvasForPointer(canvas);

      fireEvent.click(screen.getByLabelText("消しゴム"));

      await act(async () => {
        fireEvent.pointerDown(canvas, {
          clientX: 5,
          clientY: 5,
          pointerId: 1,
          buttons: 1,
        });
        // 消しゴムで描画中は destination-out のはず
        expect(mockCtx.globalCompositeOperation).toBe("destination-out");
      });

      await act(async () => {
        fireEvent.pointerCancel(canvas, {
          clientX: 5,
          clientY: 5,
          pointerId: 1,
        });
      });

      // キャンセル後は idle 用 source-over に戻る
      expect(mockCtx.globalCompositeOperation).toBe("source-over");
    });

    it("描画中でない（isDrawing=false）ときの pointercancel は drawImage も onChange も発生しない", async () => {
      // handlePointerCancel の先頭ガード: !isDrawingRef.current → return
      const onChange = vi.fn();
      const { container } = render(<HandwritingCanvas onChange={onChange} />);
      const canvas = getCanvas(container);
      setupCanvasForPointer(canvas);

      // pointerdown なしで pointercancel だけ発火
      await act(async () => {
        fireEvent.pointerCancel(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        });
      });

      expect(mockCtx.drawImage).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("pointercancel 後の pointermove（buttons: 1）では描画は再開されない", async () => {
      const { container } = render(<HandwritingCanvas onChange={vi.fn()} />);
      const canvas = getCanvas(container);
      setupCanvasForPointer(canvas);

      await act(async () => {
        fireEvent.pointerDown(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
          buttons: 1,
        });
      });

      await act(async () => {
        fireEvent.pointerCancel(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        });
      });

      mockCtx.fill.mockClear();
      mockCtx.drawImage.mockClear();

      // 2の適用後は recovery を行わないため、move だけでは描画が再開しない
      await act(async () => {
        fireEvent.pointerMove(canvas, {
          clientX: 20,
          clientY: 20,
          pointerId: 1,
          buttons: 1,
        });
      });

      expect(mockCtx.fill).not.toHaveBeenCalled();
      expect(mockCtx.drawImage).not.toHaveBeenCalled();
    });

    it("pointercancel 後も pointerup では onChange が呼ばれない（cancel がストロークを確定させない）", async () => {
      // pointercancel でストローク状態がリセットされるため、
      // その後の pointerup は isDrawingRef=false のまま finishDrawing が早期リターンする。
      const onChange = vi.fn();
      const { container } = render(<HandwritingCanvas onChange={onChange} />);
      const canvas = getCanvas(container);
      setupCanvasForPointer(canvas);

      await act(async () => {
        fireEvent.pointerDown(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
          buttons: 1,
        });
      });

      await act(async () => {
        fireEvent.pointerCancel(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        });
      });

      // cancel で onChange は呼ばれない
      expect(onChange).not.toHaveBeenCalled();

      // cancel 後の pointerup も onChange を呼ばない（isDrawing=false）
      await act(async () => {
        fireEvent.pointerUp(canvas, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
          buttons: 0,
        });
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
