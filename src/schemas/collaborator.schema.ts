import { z } from "zod";
import { CollaboratorRole, CollaboratorStatus, AvailabilityStatus, PaymentType, CollaboratorPaymentStatus } from "@prisma/client";
import { idSchema } from "../utils/sharedSchema";

// --- Collaborator Schemas ---
export const collaboratorCreateSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"), // Nome vem do User, mas admin pode criar user+collaborator? Ver controller.
  email: z.string().email("Email inválido"), // Idem
  phone: z.string().optional(),
  role: z.nativeEnum(CollaboratorRole).optional(),
  specialties: z.array(z.string()).optional().default([]),
  hourlyRate: z.coerce.number().positive().optional(),
  fixedRate: z.coerce.number().positive().optional(),
  status: z.nativeEnum(CollaboratorStatus).optional(),
  equipment: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  workingRadius: z.coerce.number().int().optional(),
  languages: z.array(z.string()).optional(),
  functionId: idSchema.optional()
});

export const collaboratorUpdateSchema = collaboratorCreateSchema.partial();

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.string().optional(), 
  name: z.string().optional()
});

// --- Availability Schemas ---
export const availabilityCreateSchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "Data inválida"), // ISO Date
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  status: z.nativeEnum(AvailabilityStatus),
  notes: z.string().optional(),
  collaboratorId: idSchema.optional() // Se admin criar para outro
});

export const availabilityUpdateSchema = availabilityCreateSchema.partial();

// --- Payment Schemas ---
export const paymentCreateSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.nativeEnum(PaymentType),
  description: z.string().min(1),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Data inválida"),
  paymentDate: z.string().refine((d) => !isNaN(Date.parse(d))).optional(),
  status: z.nativeEnum(CollaboratorPaymentStatus).optional(),
  notes: z.string().optional(),
  eventId: idSchema,
  collaboratorId: idSchema
});

export const paymentUpdateSchema = paymentCreateSchema.partial();

// --- Event Assignment Schemas ---
export const eventAssignmentSchema = z.object({
  bookingId: idSchema,
  collaboratorId: idSchema,
  role: z.nativeEnum(CollaboratorRole).optional(),
  hourlyRate: z.coerce.number().optional(),
  fixedRate: z.coerce.number().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM").optional(),
});
