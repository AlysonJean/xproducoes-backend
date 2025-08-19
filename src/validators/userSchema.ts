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

export const userRegisterSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const userLoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
