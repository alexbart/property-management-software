import { useEffect, useState, type FormEvent } from "react";
import type { AmenityCategory } from "../../hooks/useInventory";
import type { AmenityView } from "../../hooks/useInventory";
import {
  useCreateAmenity,
  useUpdateAmenity,
} from "../../hooks/useInventoryMutations";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

const CATEGORIES: AmenityCategory[] = ["FEATURE", "AMENITY", "UTILITY"];

export interface AmenityFormDialogProps {
  open: boolean;
  onClose: () => void;
  amenity?: AmenityView;
}

export function AmenityFormDialog({ open, onClose, amenity }: AmenityFormDialogProps) {
  const isEdit = Boolean(amenity);
  const createAmenity = useCreateAmenity();
  const updateAmenity = useUpdateAmenity();

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AmenityCategory>("AMENITY");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setKey(amenity?.key ?? "");
      setName(amenity?.name ?? "");
      setCategory(amenity?.category ?? "AMENITY");
      setError("");
    }
  }, [open, amenity]);

  const pending = createAmenity.isPending || updateAmenity.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (isEdit && amenity) {
        await updateAmenity.mutateAsync({
          id: amenity.id,
          input: { name, category },
        });
      } else {
        await createAmenity.mutateAsync({ key, name, category });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save amenity");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit amenity" : "Add amenity"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="amenity-form" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="amenity-form" className="space-y-4" onSubmit={handleSubmit}>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <label className="block text-sm">
          <span className="font-medium">Key</span>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            disabled={isEdit}
            placeholder="wifi"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Wi-Fi"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Category</span>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as AmenityCategory)}
            className="mt-1"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </label>
      </form>
    </Dialog>
  );
}