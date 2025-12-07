import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md",
  secondary:
    "bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400",
  outline:
    "border-2 border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100",
};

export function Button({
  children,
  href,
  variant = "primary",
  onClick,
  className = "",
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={combinedClassName}>
      {children}
    </button>
  );
}
