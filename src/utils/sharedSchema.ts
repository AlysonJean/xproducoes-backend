import { z } from "zod";

/**
 * Common Zod schemas for the application
 */

// Schema that accepts either UUID (standard) or CUID (Prisma default in this project)
export const idSchema = z.union([
  z.string().uuid(),
  z.string().regex(/^[a-z0-9]{20,}$/i, "Invalid ID format (expected UUID or CUID)")
]);

// Helper for plural IDs
export const idArraySchema = z.array(idSchema);
