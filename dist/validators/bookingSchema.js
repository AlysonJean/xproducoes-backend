"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingCancelSchema = exports.deliveryStatusUpdateSchema = exports.bookingStatusUpdateSchema = exports.bookingUpdateSchema = exports.bookingFiltersSchema = exports.bookingCreateSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// Schema base para criação de booking
exports.bookingCreateSchema = zod_1.z
    .object({
    // Cliente (ou user registrado ou dados manuais)
    // aceitar UUIDs ou CUIDs (seed usa cuid())
    userId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    clientId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    clientName: zod_1.z.string().min(1).optional(),
    clientContact: zod_1.z.string().min(1).optional(),
    clientEmail: zod_1.z.string().email().optional(),
    // Equipamentos/Kits
    kitId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    equipmentIds: zod_1.z
        .array(zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]))
        .min(1, "Selecione pelo menos um equipamento")
        .optional(),
    // Datas do evento (aceita ISO datetime e datetime-local como 'YYYY-MM-DDTHH:mm')
    eventDate: zod_1.z
        .string()
        .refine((s) => {
        const parsed = Date.parse(s);
        return !isNaN(parsed);
    }, { message: "A data do evento é inválida." }),
    eventEndDate: zod_1.z
        .string()
        .refine((s) => {
        const parsed = Date.parse(s);
        return !isNaN(parsed);
    }, { message: "A data final do evento é inválida." }),
    // Detalhes do evento
    eventTitle: zod_1.z.string().min(1).optional(),
    eventDuration: zod_1.z.number().positive().optional(),
    // Endereço
    location: zod_1.z.string().min(1, "Local é obrigatório"),
    street: zod_1.z.string().min(1, "Rua é obrigatória"),
    neighborhood: zod_1.z.string().min(1, "Bairro é obrigatório"),
    city: zod_1.z.string().min(1, "Cidade é obrigatória"),
    state: zod_1.z.string().min(1, "Estado é obrigatório"),
    zipCode: zod_1.z.string().min(1, "CEP é obrigatório"),
    addressNumber: zod_1.z.string().min(1, "Número é obrigatório"),
    addressComplement: zod_1.z.string().optional(),
    // Características do local
    requiresStairs: zod_1.z.boolean().optional().default(false),
    isCovered: zod_1.z.boolean().optional().default(true),
    hasParking: zod_1.z.boolean().optional().default(true),
    // Observações e solicitações
    notes: zod_1.z.string().optional(),
    specialRequests: zod_1.z.string().optional(),
    // Status (opcionais para criação)
    status: zod_1.z.nativeEnum(client_1.BookingStatus).optional().default(client_1.BookingStatus.DRAFT),
    deliveryStatus: zod_1.z.nativeEnum(client_1.DeliveryStatus).optional().default(client_1.DeliveryStatus.PENDING),
    // Preço total (calculado automaticamente)
    totalPrice: zod_1.z.number().positive().optional(),
    // Campos admin-only
    serviceValue: zod_1.z.number().positive().optional(),
    paymentProofUrl: zod_1.z.string().url().optional(),
})
    .refine((data) => {
    // Garante que pelo menos uma forma de identificar o cliente seja fornecida
    return data.userId || data.clientId || (data.clientName && data.clientContact);
}, {
    message: "É necessário associar a reserva a um cliente registrado ou fornecer dados de contato.",
    path: ["clientName"],
})
    .refine((data) => {
    // Garante que pelo menos um kit ou equipamentos sejam fornecidos
    return data.kitId || (data.equipmentIds && data.equipmentIds.length > 0);
}, {
    message: "É necessário fornecer um kit ou uma lista de equipamentos.",
    path: ["kitId"],
})
    .refine((data) => {
    // Garante que a data final seja posterior à data inicial
    const startDate = new Date(data.eventDate);
    const endDate = new Date(data.eventEndDate);
    return endDate > startDate;
}, {
    message: "A data final deve ser posterior à data inicial do evento.",
    path: ["eventEndDate"],
});
// Schema para filtros de busca
exports.bookingFiltersSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.BookingStatus).optional(),
    deliveryStatus: zod_1.z.nativeEnum(client_1.DeliveryStatus).optional(),
    eventDateFrom: zod_1.z.date().optional(),
    eventDateTo: zod_1.z.date().optional(),
    clientId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    creatorId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    assigneeId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    kitId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)]).optional(),
    equipmentIds: zod_1.z.array(zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.string().regex(/^[a-z0-9]{20,}$/i)])).optional(),
});
// Schema para atualização de booking
exports.bookingUpdateSchema = exports.bookingCreateSchema.partial();
// Schema para atualização de status
exports.bookingStatusUpdateSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.BookingStatus),
});
// Schema para atualização de status de entrega
exports.deliveryStatusUpdateSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.DeliveryStatus),
});
// Schema para cancelamento
exports.bookingCancelSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Motivo do cancelamento é obrigatório"),
});
