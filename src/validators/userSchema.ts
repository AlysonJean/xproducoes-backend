import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").optional(),
  email: z.string().email("E-mail inválido").optional(),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url("URL do avatar inválida").optional(),
  role: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  socialLinks: z.any().optional(),
  verified: z.boolean().optional(),
  profileSettings: z.any().optional(),
});

// Política de senha configurável: forte opcional em produção
const strongPasswords = process.env.STRONG_PASSWORDS === 'true';
const strongPasswordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um símbolo');
const basicPasswordSchema = z.string().min(6, "A senha deve ter pelo menos 6 caracteres");
const registerPasswordSchema = strongPasswords ? strongPasswordSchema : basicPasswordSchema;

export const userRegisterSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: registerPasswordSchema,
});

export const userLoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  // Compatibilidade: usuários antigos podem ter senha com 6+ caracteres
  password: basicPasswordSchema,
});
