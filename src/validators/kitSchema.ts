// Caminho: backend/src/schemas/kitSchema.ts

import { z } from "zod";

export const kitFormSchema = z.object({
  name: z.string().min(3, "O nome do kit é obrigatório."),
  description: z
    .string()
    .min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um número positivo."),
  equipmentIds: z
    .array(z.string())
    .min(1, "Selecione pelo menos um equipamento para o kit."),
  image: z.any().optional(),
});

// Schema para criação de kit via API (sem campo image opcional)
export const kitCreateSchema = z.object({
  name: z.string().min(3, "O nome do kit é obrigatório."),
  description: z
    .string()
    .min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().positive("O preço deve ser um número positivo."),
  equipmentIds: z
    .array(z.string().min(1, "ID do equipamento deve ser uma string válida"))
    .min(1, "Selecione pelo menos um equipamento para o kit."),
});

export type KitFormData = z.infer<typeof kitFormSchema>;
export type KitCreateData = z.infer<typeof kitCreateSchema>;
