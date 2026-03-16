import { z } from "zod";
import { ItemStatus } from "@prisma/client";

export const equipmentCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().min(5, "Descrição obrigatória"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  pricePerHour: z.coerce.number().positive("Preço deve ser positivo"),
  quantity: z.coerce.number().int().nonnegative("Quantidade deve ser não-negativa"),
  categoryId: z.string().min(1, "Categoria obrigatória"),
  tags: z.any().transform((v) => (typeof v === 'string' ? JSON.parse(v) : v)).pipe(z.array(z.string())).optional(),
  specifications: z.any().transform((v) => (typeof v === 'string' ? JSON.parse(v) : v)).pipe(z.record(z.string(), z.any())).optional(), // JSON
  weight: z.coerce.number().optional(),
  dimensions: z.any().transform((v) => (typeof v === 'string' ? JSON.parse(v) : v)).pipe(z.record(z.string(), z.any())).optional(),
  powerRequirements: z.string().optional(),
  maintenanceNotes: z.string().optional(),
  condition: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  minimumRentalDuration: z.coerce.number().int().optional(),
  replacementCost: z.coerce.number().optional(),
  status: z.nativeEnum(ItemStatus).optional(),
});

export const equipmentUpdateSchema = equipmentCreateSchema.partial();
