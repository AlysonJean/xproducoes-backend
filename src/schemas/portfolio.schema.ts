import { z } from "zod";

/**
 * Validação para Portfolio
 */
export const portfolioCreateSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().min(1, "Descrição obrigatória"),
  eventDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Data inválida"),
  tags: z.preprocess(
    (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v),
    z.array(z.string()).optional()
  ),
  imageUrls: z.array(z.string()).optional(),
  uploadedFiles: z.array(z.any()).optional(),
  category: z.string().optional(),
});

export const portfolioUpdateSchema = portfolioCreateSchema.partial();

export const portfolioReorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int()
  }))
});
