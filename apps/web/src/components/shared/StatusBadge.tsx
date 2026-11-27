import { Badge } from "../ui/Badge";

type BadgeVariant = "default" | "success" | "warning" | "danger";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  COMPLETED: "success",
  RESOLVED: "success",
  APPROVED: "success",
  PAID: "success",
  PENDING: "warning",
  OPEN: "warning",
  IN_PROGRESS: "default",
  DRAFT: "default",
  FAILED: "danger",
  OVERDUE: "danger",
  REJECTED: "danger",
  CANCELLED: "danger",
  TERMINATED: "danger",
  EXPIRED: "danger",
  WITHDRAWN: "default",
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? "default";
  return (
    <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>
  );
}