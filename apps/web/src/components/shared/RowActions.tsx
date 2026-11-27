import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";

export interface RowAction {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

export interface RowActionsProps {
  actions: RowAction[];
  ariaLabel: string;
}

/** Shared per-row actions menu (Edit / Deactivate / etc.). */
export function RowActions({ actions, ariaLabel }: RowActionsProps) {
  return (
    <Dropdown
      trigger={
        <Button variant="outline" size="sm" aria-label={ariaLabel}>
          Actions
          <ChevronDown className="h-3 w-3" />
        </Button>
      }
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onSelect}
          className={
            "flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-slate-100 " +
            (action.danger ? "text-error" : "text-text")
          }
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </Dropdown>
  );
}