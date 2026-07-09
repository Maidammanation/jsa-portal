import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-accent text-brand-dark hover:bg-accent-light",
  danger: "bg-status-disabled text-white hover:bg-red-600",
  ghost: "bg-transparent text-brand border border-brand/30 hover:bg-brand/5",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    />
  );
}
