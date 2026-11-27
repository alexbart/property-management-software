import { useEffect, useState, type FormEvent } from "react";
import type {
  PolicyDefinitionView,
  PolicyValueType,
} from "../../hooks/useInventory";
import {
  useCreatePolicy,
  useUpdatePolicy,
} from "../../hooks/useInventoryMutations";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

const VALUE_TYPES: PolicyValueType[] = ["BOOLEAN", "ENUM", "INTEGER", "TEXT"];

export interface PolicyFormDialogProps {
  open: boolean;
  onClose: () => void;
  policy?: PolicyDefinitionView;
}

export function PolicyFormDialog({ open, onClose, policy }: PolicyFormDialogProps) {
  const isEdit = Boolean(policy);
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [valueType, setValueType] = useState<PolicyValueType>("TEXT");
  const [enumValues, setEnumValues] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setKey(policy?.key ?? "");
      setName(policy?.name ?? "");
      setValueType(policy?.valueType ?? "TEXT");
      setEnumValues(policy?.enumValues.join(", ") ?? "");
      setError("");
    }
  }, [open, policy]);

  const pending = createPolicy.isPending || updatePolicy.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsedEnumValues = enumValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      if (isEdit && policy) {
        await updatePolicy.mutateAsync({
          id: policy.id,
          input: { name, enumValues: parsedEnumValues },
        });
      } else {
        await createPolicy.mutateAsync({
          key,
          name,
          valueType,
          enumValues: parsedEnumValues,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit policy" : "Add policy"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="policy-form" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="policy-form" className="space-y-4" onSubmit={handleSubmit}>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <label className="block text-sm">
          <span className="font-medium">Key</span>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            disabled={isEdit}
            placeholder="pet_policy"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Pet policy"
            className="mt-1"
          />
        </label>
        {!isEdit ? (
          <label className="block text-sm">
            <span className="font-medium">Value type</span>
            <Select
              value={valueType}
              onChange={(e) => setValueType(e.target.value as PolicyValueType)}
              className="mt-1"
            >
              {VALUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        {valueType === "ENUM" || policy?.valueType === "ENUM" ? (
          <label className="block text-sm">
            <span className="font-medium">Allowed values (comma separated)</span>
            <Input
              value={enumValues}
              onChange={(e) => setEnumValues(e.target.value)}
              required
              placeholder="ALLOWED, NOT_ALLOWED"
              className="mt-1"
            />
          </label>
        ) : null}
      </form>
    </Dialog>
  );
}