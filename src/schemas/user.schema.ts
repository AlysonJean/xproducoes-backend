import { z } from "zod";

/**
 * Validação para atualização de perfil de usuário
 */
export const updateUserSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional().or(z.literal("")),
  avatarUrl: z.string().url("URL do avatar inválida").optional().or(z.literal("")),
  bio: z.string().max(500, "Bio muito longa (máx 500 chars)").optional(),
  location: z.string().max(100, "Localização muito longa").optional(),
  website: z.string().url("Website inválido").optional().or(z.literal("")),
  socialLinks: z.any().transform((v) => (typeof v === 'string' ? JSON.parse(v) : v)).optional(),
  preferences: z.any().transform((v) => (typeof v === 'string' ? JSON.parse(v) : v)).optional(),
});

/**
 * Validação para atualização administrativa (pode alterar role/status)
 */
export const adminUpdateUserSchema = updateUserSchema.extend({
  role: z.enum(["ADMIN", "CLIENT", "COLLABORATOR", "MANAGER"]).optional(),
  verified: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

/**
 * Validação de troca de senha
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres")
});
