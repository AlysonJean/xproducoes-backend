import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
});
