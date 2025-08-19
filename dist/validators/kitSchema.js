"use strict";
// Caminho: backend/src/schemas/kitSchema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.kitCreateSchema = exports.kitFormSchema = void 0;
const zod_1 = require("zod");
exports.kitFormSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "O nome do kit é obrigatório."),
    description: zod_1.z
        .string()
        .min(10, "A descrição deve ter pelo menos 10 caracteres."),
    price: zod_1.z.coerce.number().positive("O preço deve ser um número positivo."),
    equipmentIds: zod_1.z
        .array(zod_1.z.string())
        .min(1, "Selecione pelo menos um equipamento para o kit."),
    image: zod_1.z.any().optional(),
});
// Schema para criação de kit via API (sem campo image opcional)
exports.kitCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "O nome do kit é obrigatório."),
    description: zod_1.z
        .string()
        .min(10, "A descrição deve ter pelo menos 10 caracteres."),
    price: zod_1.z.coerce.number().positive("O preço deve ser um número positivo."),
    equipmentIds: zod_1.z
        .array(zod_1.z.string().min(1, "ID do equipamento deve ser uma string válida"))
        .min(1, "Selecione pelo menos um equipamento para o kit."),
});
