import type { Amenity, PolicyDefinition } from "@prisma/client";
import type { ResolvedAmenity } from "./amenity-resolver.js";
import type { ResolvedPolicy } from "./policy-resolver.js";

export interface AmenityDto {
  id: string;
  key: string;
  name: string;
  category: Amenity["category"];
}

export function toAmenityDto(amenity: Amenity): AmenityDto {
  return {
    id: amenity.id,
    key: amenity.key,
    name: amenity.name,
    category: amenity.category,
  };
}

export interface PolicyDefinitionDto {
  id: string;
  key: string;
  name: string;
  valueType: PolicyDefinition["valueType"];
  enumValues: string[];
}

export function toPolicyDefinitionDto(
  definition: PolicyDefinition,
): PolicyDefinitionDto {
  return {
    id: definition.id,
    key: definition.key,
    name: definition.name,
    valueType: definition.valueType,
    enumValues: definition.enumValues,
  };
}

export interface ResolvedAmenityDto {
  amenityId: string;
  source: ResolvedAmenity["source"];
  inherited: boolean;
}

export function toResolvedAmenityDto(
  amenity: ResolvedAmenity,
): ResolvedAmenityDto {
  return {
    amenityId: amenity.amenityId,
    source: amenity.source,
    inherited: amenity.inherited,
  };
}

export interface ResolvedPolicyDto {
  policyId: string;
  source: ResolvedPolicy["source"];
  inherited: boolean;
  value: ResolvedPolicy["value"];
}

export function toResolvedPolicyDto(
  policy: ResolvedPolicy,
): ResolvedPolicyDto {
  return {
    policyId: policy.policyId,
    source: policy.source,
    inherited: policy.inherited,
    value: policy.value,
  };
}