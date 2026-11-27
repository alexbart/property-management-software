import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../database/prisma.js";
import { hashPassword } from "../modules/auth/services/auth.service.js";
import type { UserRole } from "@prisma/client";

export interface AuthenticatedAgent {
  agent: request.Agent;
  user: {
    id: string;
    email: string;
    role: UserRole;
    propertyMemberships: { propertyId: string; role: UserRole }[];
    tenantLink: { tenantId: string } | null;
  };
}

export async function createTestUser(
  email: string,
  password: string,
  role: UserRole,
): Promise<{ id: string; email: string; role: UserRole }> {
  const { passwordHash, passwordSalt } = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, passwordSalt, role },
    select: { id: true, email: true, role: true },
  });
  return user;
}

export async function createPropertyMembership(
  userId: string,
  propertyId: string,
  role: UserRole,
) {
  return prisma.propertyMembership.create({
    data: { userId, propertyId, role },
  });
}

export async function createTenantLink(userId: string, tenantId: string) {
  return prisma.tenantLink.create({
    data: { userId, tenantId },
  });
}

export async function createAuthenticatedAgent(
  email: string,
  password: string,
  role: UserRole,
  propertyId?: string,
  membershipRole?: UserRole,
  tenantId?: string,
): Promise<AuthenticatedAgent> {
  const user = await createTestUser(email, password, role);

  if (propertyId && membershipRole) {
    await createPropertyMembership(user.id, propertyId, membershipRole);
  }

  if (tenantId) {
    await createTenantLink(user.id, tenantId);
  }

  const agent = request.agent(app);

  await agent
    .post("/api/v1/auth/login")
    .send({ email, password })
    .expect(200);

  const memberships = await prisma.propertyMembership.findMany({
    where: { userId: user.id },
    select: { propertyId: true, role: true },
  });

  const tenantLink = await prisma.tenantLink.findUnique({
    where: { userId: user.id },
    select: { tenantId: true },
  });

  return {
    agent,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      propertyMemberships: memberships,
      tenantLink,
    },
  };
}

export async function cleanupTestUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (user) {
    await prisma.user.delete({ where: { id: user.id } });
  }
}

export async function withAuthenticatedAgent(
  email: string,
  password: string,
  role: UserRole,
  propertyId?: string,
  membershipRole?: UserRole,
  tenantId?: string,
): Promise<AuthenticatedAgent> {
  await cleanupTestUser(email);
  return createAuthenticatedAgent(
    email,
    password,
    role,
    propertyId,
    membershipRole,
    tenantId,
  );
}