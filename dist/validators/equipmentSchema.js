"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.equipmentCreateSchema = void 0;
const zod_1 = require("zod");
exports.equipmentCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
    description: zod_1.z.string().min(5, "Descrição obrigatória"),
    pricePerHour: zod_1.z.coerce.number().positive("Preço deve ser positivo"),
    quantity: zod_1.z.coerce.number().int().positive("Quantidade deve ser positiva"),
});
