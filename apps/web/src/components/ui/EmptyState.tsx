import type { ReactNode } from "react";
import { Card } from "./Card";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      {icon ? <div className="text-muted">{icon}</div> : null}
      <p className="text-base font-semibold text-text">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}