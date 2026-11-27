import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;
const MIN_PASSWORD_LENGTH = 12;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConflictError";
  }
}

function deriveKey(
  password: string,
  salt: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(
  password: string,
): Promise<{ passwordHash: string; passwordSalt: string }> {
  const passwordSalt = randomBytes(16).toString("hex");
  const derivedKey = await deriveKey(password, passwordSalt);
  return { passwordHash: derivedKey.toString("hex"), passwordSalt };
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string,
): Promise<boolean> {
  const derivedKey = await deriveKey(password, passwordSalt);
  const stored = Buffer.from(passwordHash, "hex");
  if (stored.length !== derivedKey.length) {
    return false;
  }
  return timingSafeEqual(stored, derivedKey);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function register(
  email: string,
  password: string,
  role: UserRole,
) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    throw new AuthConflictError("Email already registered");
  }

  const { passwordHash, passwordSalt } = await hashPassword(password);

  try {
    return await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, passwordSalt, role },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AuthConflictError("Email already registered");
    }
    throw error;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.active) {
    throw new AuthError("Invalid credentials");
  }

  const valid = await verifyPassword(
    password,
    user.passwordHash,
    user.passwordSalt,
  );

  if (!valid) {
    throw new AuthError("Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return user;
}

export async function getSessionUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      propertyMemberships: {
        select: { propertyId: true, role: true },
      },
      tenantLink: {
        select: { tenantId: true },
      },
    },
  });
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;

export type RegisterInput = {
  email: string;
  password: string;
  role: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};