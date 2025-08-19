import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
});
