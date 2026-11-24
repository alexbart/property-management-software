import { z } from "zod";

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Provider-neutral image metadata. The database stores only references; the
 * binary object lives in external storage (provider chosen later).
 */
export const imageMetadataSchema = z.object({
  storageProvider: z.string().min(1).max(40),
  storageKey: z.string().min(1).max(512),
  mimeType: z
    .string()
    .min(1)
    .max(128)
    .refine((value) => SUPPORTED_MIME_TYPES.has(value), {
      message: "Unsupported image MIME type",
    }),
  fileSize: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  originalFilename: z.string().min(1).max(255),
  caption: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;

export function parseImageMetadata(input: unknown): ImageMetadata {
  return imageMetadataSchema.parse(input);
}