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
// Política de senha configurável: forte opcional em produção
const strongPasswords = process.env.STRONG_PASSWORDS === 'true';
const strongPasswordSchema = zod_1.z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um símbolo');
const basicPasswordSchema = zod_1.z.string().min(6, "A senha deve ter pelo menos 6 caracteres");
const registerPasswordSchema = strongPasswords ? strongPasswordSchema : basicPasswordSchema;
exports.userRegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: zod_1.z.string().email("E-mail inválido"),
    password: registerPasswordSchema,
});
exports.userLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("E-mail inválido"),
    // Compatibilidade: usuários antigos podem ter senha com 6+ caracteres
    password: basicPasswordSchema,
});
