import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAmenityDto,
  CreatePolicyDefinitionDto,
  UpdateAmenityDto,
  UpdatePolicyDefinitionDto,
} from "@property-platform/contracts";
import { apiClient } from "../lib/api-client";

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };
}

export function useCreateAmenity() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: CreateAmenityDto) =>
      apiClient("/api/v1/inventory/amenities", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateAmenity() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAmenityDto }) =>
      apiClient(`/api/v1/inventory/amenities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeactivateAmenity() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/inventory/amenities/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });
}

export function useCreatePolicy() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: CreatePolicyDefinitionDto) =>
      apiClient("/api/v1/inventory/policies", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdatePolicy() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePolicyDefinitionDto }) =>
      apiClient(`/api/v1/inventory/policies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeactivatePolicy() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/inventory/policies/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });
}