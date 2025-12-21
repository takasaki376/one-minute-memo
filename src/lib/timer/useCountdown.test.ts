import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("auto starts countdown and calls onFinish once", () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 2, onFinish })
    );

    expect(result.current.secondsLeft).toBe(2);
    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onFinish).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("supports manual start/pause and no-op start at zero", () => {
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 3, autoStart: false })
    );

    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.secondsLeft).toBe(1);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isRunning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.secondsLeft).toBe(1);

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(false);
  });

  it("resets to new initial seconds and re-enables onFinish", () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useCountdown({ initialSeconds: 1, autoStart: false, onFinish })
    );

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(onFinish).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.reset(3);
    });
    expect(result.current.secondsLeft).toBe(3);
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(onFinish).toHaveBeenCalledTimes(2);
  });
});
