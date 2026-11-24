import type { InventoryLevel } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import type { ImageMetadata } from "./image-metadata.js";

export interface ImageTarget {
  level: InventoryLevel;
  propertyId: string;
  buildingId?: string | null;
  unitId?: string | null;
}

function targetWhere(target: ImageTarget) {
  return {
    level: target.level,
    propertyId: target.propertyId,
    buildingId: target.buildingId ?? null,
    unitId: target.unitId ?? null,
  };
}

export async function createImage(
  target: ImageTarget,
  metadata: ImageMetadata,
) {
  return prisma.inventoryImage.create({
    data: {
      ...targetWhere(target),
      storageProvider: metadata.storageProvider,
      storageKey: metadata.storageKey,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      originalFilename: metadata.originalFilename,
      caption: metadata.caption ?? null,
      sortOrder: metadata.sortOrder,
      isPrimary: metadata.isPrimary,
    },
  });
}

export async function listImages(target: ImageTarget) {
  return prisma.inventoryImage.findMany({
    where: { ...targetWhere(target), deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Soft-delete metadata and flag the external object for cleanup. The object
 * is only marked DONE after storage confirms deletion (see markCleanupDone).
 */
export async function softDeleteImage(id: string) {
  return prisma.inventoryImage.update({
    where: { id },
    data: { deletedAt: new Date(), storageCleanupStatus: "PENDING" },
  });
}

export async function markCleanupDone(id: string) {
  return prisma.inventoryImage.update({
    where: { id },
    data: { storageCleanupStatus: "DONE" },
  });
}

export async function markCleanupFailed(id: string) {
  return prisma.inventoryImage.update({
    where: { id },
    data: { storageCleanupStatus: "FAILED" },
  });
}