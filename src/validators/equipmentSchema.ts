import { z } from "zod";

export const equipmentCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().min(5, "Descrição obrigatória"),
  pricePerHour: z.coerce.number().positive("Preço deve ser positivo"),
  quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
});
