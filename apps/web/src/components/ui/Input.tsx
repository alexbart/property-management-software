import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border bg-surface px-3 text-sm text-text shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-slate-50",
        invalid ? "border-error focus-visible:ring-error" : "border-border",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}