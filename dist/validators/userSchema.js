"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userLoginSchema = exports.userRegisterSchema = exports.profileUpdateSchema = void 0;
const zod_1 = require("zod");
exports.profileUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "O nome deve ter pelo menos 3 caracteres").optional(),
    email: zod_1.z.string().email("E-mail inválido").optional(),
    password: zod_1.z
        .string()
        .min(6, "A senha deve ter pelo menos 6 caracteres")
        .optional(),
    phone: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().url("URL do avatar inválida").optional(),
    role: zod_1.z.string().optional(),
    bio: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    website: zod_1.z.string().optional(),
    socialLinks: zod_1.z.any().optional(),
    verified: zod_1.z.boolean().optional(),
    profileSettings: zod_1.z.any().optional(),
});
exports.userRegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: zod_1.z.string().email("E-mail inválido"),
    password: zod_1.z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
exports.userLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("E-mail inválido"),
    password: zod_1.z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
