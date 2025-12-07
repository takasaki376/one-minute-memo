<<<<<<< HEAD
"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import cc from "classcat";
=======
'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import cc from 'classcat';
>>>>>>> 3bf250f (feat: TextEditorとHandwritingCanvasコンポーネント実装 (PJ1-97))

export interface HandwritingCanvasProps {
  /** 現在のキャンバス内容（dataURL）。履歴からの復元などに使う */
  value?: string | null;
  /** 描画内容が更新されたときに呼ばれる（null は「空」） */
  onChange?: (dataUrl: string | null) => void;

  /** 編集不可にするかどうか */
  disabled?: boolean;
  /** 論理的な幅と高さ（CSS じゃなくキャンバスの解像度） */
  width?: number;
  height?: number;

  /** 外側コンテナに追加するクラス */
  className?: string;
}

/**
 * 手書き用のシンプルな Canvas コンポーネント（MVP版）。
 * - マウス & タッチ対応（pointer イベント）
 * - 描画終了時（pointerup）に dataURL を onChange で返す
 * - 「クリア」ボタンで全消し＆onChange(null)
 */
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

  // キャンバスの初期設定（サイズ & DPR 対応）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827'; // slate-900 相当
    ctx.fillStyle = '#ffffff';

    // 背景を白で塗りつぶす
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  // value からの復元（MVP: value が変わったときに上書きする）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // いったん白でクリア
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // scale 影響を避けるためリセット
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (!value) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = value;
  }, [value, width, height]);

  const getCanvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;

    const { x, y } = getCanvasPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (
    event,
  ) => {
    if (!isDrawingRef.current) return;
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
      const dataUrl = canvas.toDataURL('image/png');
      onChange?.(dataUrl);
    } catch (e) {
      console.error('Failed to export canvas as dataURL', e);
    }

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // noop
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
    // 外に出ても描画終了扱い
    finishDrawing(event);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    onChange?.(null);
  };

  const containerClass = cc(['flex flex-col gap-2', className]);

  const canvasWrapperClass = cc([
    'relative',
    'rounded-md',
    'border',
    'border-slate-300',
    'bg-white',
    disabled && 'opacity-70',
  ]);

  const canvasClass = cc([
    'block',
    'rounded-md',
    'touch-none', // スクロールではなく描画優先
    disabled && 'pointer-events-none',
  ]);

  const clearButtonClass = cc([
    'self-end',
    'inline-flex items-center justify-center',
    'rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600',
    'hover:bg-slate-50',
    'transition-colors',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
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
