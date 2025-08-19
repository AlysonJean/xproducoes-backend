"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryUpdateSchema = exports.categoryCreateSchema = void 0;
const zod_1 = require("zod");
exports.categoryCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
});
exports.categoryUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Nome obrigatório"),
});
