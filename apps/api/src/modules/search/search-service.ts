import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import type { SessionUser } from "../auth/services/auth.service.js";
import type { SearchResultItemDto } from "@property-platform/contracts";

const PER_GROUP_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

interface SearchScope {
  isAdmin: boolean;
  propertyIds?: string[];
  tenantId?: string;
}

async function resolveScope(user: SessionUser): Promise<SearchScope> {
  if (user.role === "PLATFORM_ADMIN") {
    return { isAdmin: true };
  }

  // Tenant: scope to the properties of their own lease(s).
  if (user.role === "TENANT" && user.tenantLink) {
    const leases = await prisma.lease.findMany({
      where: { tenantId: user.tenantLink.tenantId },
      select: { propertyId: true },
    });
    const propertyIds = [...new Set(leases.map((l) => l.propertyId))];
    return { isAdmin: false, propertyIds, tenantId: user.tenantLink.tenantId };
  }

  // Landlord / manager: scope to properties they are members of.
  const propertyIds = user.propertyMemberships.map((m) => m.propertyId);
  return { isAdmin: false, propertyIds };
}

function contains(value: string): Prisma.StringFilter {
  return { contains: value, mode: "insensitive" };
}

export async function search(
  rawQuery: string,
  user: SessionUser,
): Promise<{
  properties: SearchResultItemDto[];
  landlords: SearchResultItemDto[];
  tenants: SearchResultItemDto[];
}> {
  const q = rawQuery.trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return { properties: [], landlords: [], tenants: [] };
  }

  const scope = await resolveScope(user);
  const propertyWhere: Prisma.PropertyWhereInput[] = [
    { name: contains(q) },
    { reference: contains(q) },
  ];
  if (!scope.isAdmin) {
    propertyWhere.push({ id: { in: scope.propertyIds ?? [] } });
  }

  const [properties, landlords, tenants] = await Promise.all([
    prisma.property.findMany({
      where: { AND: propertyWhere },
      take: PER_GROUP_LIMIT,
      select: { id: true, name: true, reference: true, county: true },
      orderBy: { name: "asc" },
    }),
    prisma.landlord.findMany({
      where: {
        AND: [
          { name: contains(q) },
          scope.isAdmin
            ? {}
            : { properties: { some: { id: { in: scope.propertyIds ?? [] } } } },
        ],
      },
      take: PER_GROUP_LIMIT,
      select: { id: true, name: true, kind: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findMany({
      where: {
        AND: [
          {
            OR: [
              { firstName: contains(q) },
              { lastName: contains(q) },
              { phone: contains(q) },
              { email: contains(q) },
            ],
          },
          scope.tenantId
            ? { id: scope.tenantId }
            : scope.isAdmin
              ? {}
              : { leases: { some: { propertyId: { in: scope.propertyIds ?? [] } } } },
        ],
      },
      take: PER_GROUP_LIMIT,
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return {
    properties: properties.map((p) => ({
      id: p.id,
      type: "property" as const,
      label: p.name,
      sublabel: `${p.reference} · ${p.county}`,
      url: `/properties/${p.id}`,
    })),
    landlords: landlords.map((l) => ({
      id: l.id,
      type: "landlord" as const,
      label: l.name,
      sublabel: l.kind,
      url: `/landlords/${l.id}`,
    })),
    tenants: tenants.map((t) => ({
      id: t.id,
      type: "tenant" as const,
      label: `${t.firstName} ${t.lastName}`,
      sublabel: t.phone,
      url: `/tenants/${t.id}`,
    })),
  };
}