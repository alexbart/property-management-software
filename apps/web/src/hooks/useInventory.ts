import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export type AmenityCategory = "FEATURE" | "AMENITY" | "UTILITY";

export interface AmenityView {
  id: string;
  key: string;
  name: string;
  category: AmenityCategory;
}

export type PolicyValueType = "BOOLEAN" | "ENUM" | "INTEGER" | "TEXT";

export interface PolicyDefinitionView {
  id: string;
  key: string;
  name: string;
  valueType: PolicyValueType;
  enumValues: string[];
}

export function useAmenities() {
  return useQuery({
    queryKey: ["inventory", "amenities"],
    queryFn: async (): Promise<AmenityView[]> => {
      const response = await apiClient<{ data: AmenityView[] }>(
        "/api/v1/inventory/amenities",
      );
      return response.data;
    },
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: ["inventory", "policies"],
    queryFn: async (): Promise<PolicyDefinitionView[]> => {
      const response = await apiClient<{ data: PolicyDefinitionView[] }>(
        "/api/v1/inventory/policies",
      );
      return response.data;
    },
  });
}