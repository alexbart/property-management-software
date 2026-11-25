import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../database/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../../database/prisma.js";
import {
  AuthConflictError,
  AuthError,
  hashPassword,
  login,
  register,
  verifyPassword,
} from "./auth.service.js";

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("round-trips a password hash and rejects a wrong password", async () => {
    const { passwordHash, passwordSalt } = await hashPassword(
      "correct horse battery",
    );

    await expect(
      verifyPassword("correct horse battery", passwordHash, passwordSalt),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("wrong password", passwordHash, passwordSalt),
    ).resolves.toBe(false);
  });

  it("persists a hash and salt, never the plaintext password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-1",
      email: "a@example.com",
      role: "LANDLORD",
      active: true,
      createdAt: new Date(),
    } as never);

    await register("a@example.com", "supersecurepassword", "LANDLORD");

    const createArgs = vi.mocked(prisma.user.create).mock.calls[0][0];
    const data = createArgs.data as {
      passwordHash: string;
      passwordSalt: string;
    };
    expect(data.passwordHash).not.toBe("supersecurepassword");
    expect(data.passwordSalt).toHaveLength(32);
  });

  it("rejects a duplicate email with a conflict", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);

    await expect(
      register("a@example.com", "supersecurepassword", "LANDLORD"),
    ).rejects.toBeInstanceOf(AuthConflictError);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials without revealing which field failed", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("rightpassword");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "a@example.com",
      passwordHash,
      passwordSalt,
      active: true,
    } as never);

    await expect(login("a@example.com", "wrongpassword")).rejects.toThrow(
      "Invalid credentials",
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("updates lastLoginAt on successful login", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("rightpassword");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "a@example.com",
      passwordHash,
      passwordSalt,
      active: true,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await expect(login("a@example.com", "rightpassword")).resolves.toMatchObject(
      { id: "user-1" },
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { lastLoginAt: expect.any(Date) },
      }),
    );
  });

  it("throws AuthError for unknown users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(login("missing@example.com", "whatever")).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});