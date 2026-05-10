"use client";

import type React from "react";
import Link from "next/link";
import cc from "classcat";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: React.ReactNode;
  /** 見た目のバリエーション */
  variant?: ButtonVariant; // default: 'primary'
  /** サイズ */
  size?: ButtonSize; // default: 'md'
  /** type属性（form内で使う時） */
  type?: "button" | "submit" | "reset";
  /** クリックハンドラ（hrefと併用しない前提） */
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  /** ボタン無効化 */
  disabled?: boolean;
  /** ローディング中表示＆クリック無効 */
  isLoading?: boolean;
  /** リンクとして使う場合のURL。指定時は <Link><a></a></Link> を返す */
  href?: string;
  /** フル幅にするかどうか */
  fullWidth?: boolean;
  /** 左アイコン・右アイコン（必要なら） */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** aria-label（アクセシビリティ用） */
  "aria-label"?: string;
  /** テスト用識別子 */
  "data-testid"?: string;
  /** その他の追加属性を渡すための拡張用 */
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  disabled = false,
  isLoading = false,
  href,
  fullWidth = false,
  leftIcon,
  rightIcon,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
  className,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md",
    secondary:
      "bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-slate-500",
    outline:
      "border-2 border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "text-sm px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
  };

  const classes = cc([
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    isDisabled && "opacity-60 cursor-not-allowed pointer-events-none",
    fullWidth && "w-full",
    className,
  ]);

  const spinnerColor =
    variant === "primary" ? "border-white" : "border-slate-700";

  const content = (
    <>
      {isLoading && (
        <span
          className={`mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 ${spinnerColor} border-t-transparent`}
        />
      )}
      {!isLoading && leftIcon && (
        <span className="mr-2 inline-flex">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
    </>
  );

  // Linkとして使う場合
  if (href) {
    return (
      <Link
        href={href}
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        data-testid={dataTestId}
        tabIndex={isDisabled ? -1 : undefined}
        className={classes}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
      >
        {content}
      </Link>
    );
  }

  // buttonとして使う場合
  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={classes}
    >
      {content}
    </button>
  );
}
