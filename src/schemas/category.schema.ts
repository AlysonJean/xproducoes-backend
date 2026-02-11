import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  icon: z.string().optional(),
  color: z.string().regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i, "Cor inválida (hex)").optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
  parentId: z.string().optional().or(z.literal("")),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.string().optional()
});

export const categoryUpdateSchema = categoryCreateSchema.partial();
