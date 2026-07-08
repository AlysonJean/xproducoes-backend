import { z } from "zod";

/**
 * Validação de Senha Forte
 * - Pelo menos 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 */
const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(100, "Senha muito longa")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número");

export const loginSchema = z.object({
  email: z
    .string()
    .max(255)
    .email("Formato de e-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória").max(100),
});

export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .email("Formato de e-mail inválido"),
});

export const verifyResetTokenSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: passwordSchema,
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z
    .string()
    .email("Formato de e-mail inválido"),
  password: passwordSchema,
  phone: z.string().optional(),
});

export const socialLoginSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  // accessToken é obrigatório e deve ser validado com o provedor (Google/Facebook)
  // no controller. Nunca aceitar identidade a partir de userData enviado pelo
  // cliente sem essa validação — isso permitia personificar qualquer usuário
  // apenas conhecendo o e-mail dele (bypass de autenticação).
  accessToken: z.string().min(1, "Token de acesso é obrigatório"),
  userData: z.object({
    email: z.string().email(),
    name: z.string().optional(),
    id: z.string().optional(),
    picture: z.any().optional()
  }).optional()
});
