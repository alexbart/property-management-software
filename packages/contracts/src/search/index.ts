import { z } from "zod";

export const searchResultTypeSchema = z.enum([
  "property",
  "landlord",
  "tenant",
]);
export type SearchResultTypeDto = z.infer<typeof searchResultTypeSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});
export type SearchQueryDto = z.infer<typeof searchQuerySchema>;

export const searchResultItemSchema = z.object({
  id: z.string().uuid(),
  type: searchResultTypeSchema,
  label: z.string(),
  sublabel: z.string().optional(),
  url: z.string(),
});
export type SearchResultItemDto = z.infer<typeof searchResultItemSchema>;

export const searchResultsSchema = z.object({
  properties: z.array(searchResultItemSchema),
  landlords: z.array(searchResultItemSchema),
  tenants: z.array(searchResultItemSchema),
});
export type SearchResultsDto = z.infer<typeof searchResultsSchema>;