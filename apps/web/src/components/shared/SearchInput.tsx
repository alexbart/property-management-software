import { Search } from "lucide-react";
import { Input, type InputProps } from "../ui/Input";
import { cn } from "../../lib/utils/cn";

export interface SearchInputProps
  extends Omit<InputProps, "type" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

export function SearchInput({
  value,
  onValueChange,
  className,
  placeholder = "Search…",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        {...props}
      />
    </div>
  );
}