import { z } from "zod";
import { ItemStatus } from "@prisma/client";

export const serviceCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().min(5, "Descrição obrigatória"),
  price: z.coerce.number().positive("Preço deve ser positivo"),
  duration: z.coerce.number().int().min(30, "Mínimo 30 minutos").optional().default(60),
  imageUrl: z.string().url().optional().or(z.literal("")),
  status: z.nativeEnum(ItemStatus).optional().default("ACTIVE"),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();
