import { useState } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { RowActions } from "../../components/shared/RowActions";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import {
  usePolicies,
  type PolicyDefinitionView,
} from "../../hooks/useInventory";
import { useDeactivatePolicy } from "../../hooks/useInventoryMutations";
import { useAuth } from "../../lib/auth";
import { PolicyFormDialog } from "./PolicyFormDialog";

function valueTypeLabel(valueType: string): string {
  return valueType.charAt(0) + valueType.slice(1).toLowerCase();
}

export default function PoliciesPage() {
  const { data, isLoading, isError, error, refetch } = usePolicies();
  const { user } = useAuth();
  const isAdmin = user?.role === "PLATFORM_ADMIN";
  const deactivate = useDeactivatePolicy();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PolicyDefinitionView | undefined>(
    undefined,
  );

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(policy: PolicyDefinitionView) {
    setEditing(policy);
    setDialogOpen(true);
  }

  async function handleDeactivate(policy: PolicyDefinitionView) {
    if (!window.confirm(`Deactivate "${policy.name}"?`)) return;
    await deactivate.mutateAsync(policy.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Accommodation policy definitions assigned at property, building or unit level."
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Failed to load policies"
          }
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data && data.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="No policies yet"
          description="Policy definitions will appear here once the catalogue is populated."
        />
      ) : null}

      {!isLoading && !isError && data && data.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Key</TH>
              <TH>Value type</TH>
              <TH>Allowed values</TH>
              {isAdmin ? <TH className="text-right">Actions</TH> : null}
            </TR>
          </THead>
          <TBody>
            {data.map((policy) => (
              <TR key={policy.id}>
                <TD className="font-medium text-text">{policy.name}</TD>
                <TD className="text-muted">{policy.key}</TD>
                <TD>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted">
                    {valueTypeLabel(policy.valueType)}
                  </span>
                </TD>
                <TD className="text-muted">
                  {policy.valueType === "ENUM" && policy.enumValues.length > 0
                    ? policy.enumValues.join(", ")
                    : "—"}
                </TD>
                {isAdmin ? (
                  <TD className="text-right">
                    <RowActions
                      ariaLabel={`Actions for ${policy.name}`}
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => openEdit(policy),
                        },
                        {
                          label: "Deactivate",
                          icon: <Trash2 className="h-4 w-4" />,
                          danger: true,
                          onSelect: () => void handleDeactivate(policy),
                        },
                      ]}
                    />
                  </TD>
                ) : null}
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      <PolicyFormDialog
        open={dialogOpen}
        policy={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}