import { z } from "zod";

export const reviewCreateSchema = z.object({
  bookingId: z.string().min(1, "Booking ID é obrigatório"),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
  photos: z.array(z.string()).optional(),
  tags: z.any().transform((v) => (typeof v === 'string' ? JSON.parse(v) : v)).pipe(z.array(z.string())).optional(),
  punctuality: z.coerce.number().int().min(1).max(5).optional(),
  professionalism: z.coerce.number().int().min(1).max(5).optional(),
  quality: z.coerce.number().int().min(1).max(5).optional(),
  communication: z.coerce.number().int().min(1).max(5).optional(),
  valueForMoney: z.coerce.number().int().min(1).max(5).optional(),
  recommend: z.boolean().optional()
});

export const reviewUpdateSchema = reviewCreateSchema.partial();


export const sponsorCreateSchema = z.object({
   name: z.string().min(1, "Nome é obrigatório"),
   logoUrl: z.string().url().optional().or(z.literal("")),
   website: z.string().url().optional().or(z.literal("")),
   active: z.boolean().optional().default(true),
   sortOrder: z.coerce.number().int().optional().default(0)
});
export const sponsorUpdateSchema = sponsorCreateSchema.partial();

export const newsletterSubscribeSchema = z.object({
  email: z.string().email("E-mail inválido")
});
