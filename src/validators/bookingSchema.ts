import { z } from "zod";
import { BookingStatus, DeliveryStatus } from "@prisma/client";

// Schema base (sem refinements)
const bookingBaseSchema = z.object({
    // Cliente (ou user registrado ou dados manuais)
  // aceitar UUIDs ou CUIDs (seed usa cuid())
  userId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
  clientId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    clientName: z.string().min(1).optional(),
    clientContact: z.string().min(1).optional(),
    clientEmail: z.string().email().optional(),

    // Equipamentos/Kits/Serviços
    kitId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    equipmentIds: z
      .array(z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]))
      .optional(),
    serviceIds: z
      .array(z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]))
      .optional(),

    // Datas do evento (aceita ISO datetime e datetime-local como 'YYYY-MM-DDTHH:mm')
    eventDate: z
      .string()
      .refine((s) => {
        const parsed = Date.parse(s);
        return !isNaN(parsed);
      }, { message: "A data do evento é inválida." }),
    eventEndDate: z
      .string()
      .refine((s) => {
        const parsed = Date.parse(s);
        return !isNaN(parsed);
      }, { message: "A data final do evento é inválida." }),

    // Detalhes do evento
    eventTitle: z.string().min(1).optional(),
    eventDuration: z.number().positive().optional(),

    // Endereço
    location: z.string().min(1, "Local é obrigatório"),
    street: z.string().min(1, "Rua é obrigatória"),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(1, "Estado é obrigatório"),
    zipCode: z.string().min(1, "CEP é obrigatório"),
    addressNumber: z.string().min(1, "Número é obrigatório"),
    addressComplement: z.string().optional(),

    // Características do local
    requiresStairs: z.boolean().optional().default(false),
    isCovered: z.boolean().optional().default(true),
    hasParking: z.boolean().optional().default(true),

    // Observações e solicitações
    notes: z.string().optional(),
    specialRequests: z.string().optional(),

    // Status (opcionais para criação)
    status: z.nativeEnum(BookingStatus).optional().default(BookingStatus.DRAFT),
    deliveryStatus: z.nativeEnum(DeliveryStatus).optional().default(DeliveryStatus.PENDING),

    // Preço total (calculado automaticamente)
    totalPrice: z.number().positive().optional(),

    // Campos admin-only e logísticos
    serviceValue: z.number().positive().optional(),
    paymentProofUrl: z.string().url().optional(),
    setupTime: z.string().optional(),
    pickupTime: z.string().optional(),
  });

// Schema para criação de booking (com validações cruzadas)
export const bookingCreateSchema = bookingBaseSchema
  .refine(
    (data) => {
      // Garante que pelo menos uma forma de identificar o cliente seja fornecida
      return data.userId || data.clientId || (data.clientName && data.clientContact);
    },
    {
      message: "É necessário associar a reserva a um cliente registrado ou fornecer dados de contato.",
      path: ["clientName"],
    }
  )
  .refine(
    (data) => {
      // Garante que pelo menos um kit, equipamentos ou serviços sejam fornecidos
      return data.kitId || 
             (data.equipmentIds && data.equipmentIds.length > 0) ||
             (data.serviceIds && data.serviceIds.length > 0);
    },
    {
      message: "É necessário fornecer um kit, equipamentos ou serviços para o orçamento.",
      path: ["kitId"],
    }
  )
  .refine(
    (data) => {
      // Garante que a data final seja posterior à data inicial
      const startDate = new Date(data.eventDate);
      const endDate = new Date(data.eventEndDate);
      return endDate > startDate;
    },
    {
      message: "A data final deve ser posterior à data inicial do evento.",
      path: ["eventEndDate"],
    }
  );

// Schema para filtros de busca
export const bookingFiltersSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  deliveryStatus: z.nativeEnum(DeliveryStatus).optional(),
  eventDateFrom: z.date().optional(),
  eventDateTo: z.date().optional(),
  clientId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
  creatorId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
  assigneeId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
  kitId: z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
  equipmentIds: z.array(z.union([z.string().uuid(), z.string().regex(/^[a-z0-9]{20,}$/i)])).optional(),
});

// Schema para atualização de booking
export const bookingUpdateSchema = bookingBaseSchema.partial();

// Schema para atualização de status
export const bookingStatusUpdateSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

// Schema para atualização de status de entrega
export const deliveryStatusUpdateSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
});

// Schema para cancelamento
export const bookingCancelSchema = z.object({
  reason: z.string().min(1, "Motivo do cancelamento é obrigatório"),
});

// Tipos derivados dos schemas
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;
export type BookingStatusUpdateInput = z.infer<typeof bookingStatusUpdateSchema>;
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>;
export type BookingCancelInput = z.infer<typeof bookingCancelSchema>;
