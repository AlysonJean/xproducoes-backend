import { z } from "zod";
import { idSchema } from "../utils/sharedSchema";

export const reviewCreateSchema = z.object({
  userId: idSchema,
  bookingId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
}).strict();
