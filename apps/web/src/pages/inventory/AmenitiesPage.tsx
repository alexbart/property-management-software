import { useState } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { RowActions } from "../../components/shared/RowActions";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { useAmenities, type AmenityView } from "../../hooks/useInventory";
import { useDeactivateAmenity } from "../../hooks/useInventoryMutations";
import { useAuth } from "../../lib/auth";
import { AmenityFormDialog } from "./AmenityFormDialog";

function categoryLabel(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export default function AmenitiesPage() {
  const { data, isLoading, isError, error, refetch } = useAmenities();
  const { user } = useAuth();
  const isAdmin = user?.role === "PLATFORM_ADMIN";
  const deactivate = useDeactivateAmenity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AmenityView | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(amenity: AmenityView) {
    setEditing(amenity);
    setDialogOpen(true);
  }

  async function handleDeactivate(amenity: AmenityView) {
    if (!window.confirm(`Deactivate "${amenity.name}"?`)) return;
    await deactivate.mutateAsync(amenity.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amenities"
        description="Reusable feature, amenity and utility catalogue assigned to properties, buildings and units."
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
            error instanceof Error ? error.message : "Failed to load amenities"
          }
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data && data.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="No amenities yet"
          description="Amenities will appear here once the catalogue is populated."
        />
      ) : null}

      {!isLoading && !isError && data && data.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Key</TH>
              <TH>Category</TH>
              {isAdmin ? <TH className="text-right">Actions</TH> : null}
            </TR>
          </THead>
          <TBody>
            {data.map((amenity) => (
              <TR key={amenity.id}>
                <TD className="font-medium text-text">{amenity.name}</TD>
                <TD className="text-muted">{amenity.key}</TD>
                <TD>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted">
                    {categoryLabel(amenity.category)}
                  </span>
                </TD>
                {isAdmin ? (
                  <TD className="text-right">
                    <RowActions
                      ariaLabel={`Actions for ${amenity.name}`}
                      actions={[
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => openEdit(amenity),
                        },
                        {
                          label: "Deactivate",
                          icon: <Trash2 className="h-4 w-4" />,
                          danger: true,
                          onSelect: () => void handleDeactivate(amenity),
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

      <AmenityFormDialog
        open={dialogOpen}
        amenity={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}