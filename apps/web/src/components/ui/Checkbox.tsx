import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-text">
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}