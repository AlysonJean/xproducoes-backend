import { z } from "zod";
import { ChecklistType, ChecklistStatus, ChecklistPriority, ChecklistAssignmentStatus, ChecklistItemStatus } from "@prisma/client";
import { idArraySchema } from "../utils/sharedSchema.js";

// --- Checklist Item Schema ---
export const checklistItemCreateSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  order: z.coerce.number().int().optional(),
});

export const checklistItemUpdateSchema = checklistItemCreateSchema.partial().and(z.object({
  status: z.nativeEnum(ChecklistItemStatus).optional(),
  completedAt: z.string().datetime().optional()
}));

// --- Checklist Definition Schema ---
export const checklistCreateSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  type: z.nativeEnum(ChecklistType).optional().default("GENERAL"),
  status: z.nativeEnum(ChecklistStatus).optional(),
  isTemplate: z.boolean().optional(),
  items: z.array(checklistItemCreateSchema).optional(),
});

export const checklistUpdateSchema = checklistCreateSchema.partial();

// --- Checklist Assignment Schema ---
export const checklistAssignSchema = z.object({
  userIds: idArraySchema,
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Data inválida").optional(),
  priority: z.nativeEnum(ChecklistPriority).optional().default("MEDIUM"),
  notes: z.string().optional(),
});

export const assignmentUpdateSchema = z.object({
  status: z.nativeEnum(ChecklistAssignmentStatus).optional(),
  completedAt: z.string().datetime().optional(),
  notes: z.string().optional()
});
