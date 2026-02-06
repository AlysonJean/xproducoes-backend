import { z } from "zod";

export const reviewCreateSchema = z.object({
  userId: z.string().uuid(),
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
}).strict();
