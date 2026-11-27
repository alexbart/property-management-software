const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface MoneyDisplayProps {
  value: string | number | null | undefined;
  className?: string;
  placeholder?: string;
}

/**
 * Format a KES amount received from the backend. Performs no arithmetic.
 */
export function MoneyDisplay({
  value,
  className,
  placeholder = "—",
}: MoneyDisplayProps) {
  if (value === null || value === undefined || value === "") {
    return <span className={className}>{placeholder}</span>;
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return <span className={className}>{placeholder}</span>;
  }

  return <span className={className}>{currency.format(amount)}</span>;
}