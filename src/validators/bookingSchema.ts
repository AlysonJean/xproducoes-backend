import { z } from 'zod';
import { BookingStatus, DeliveryStatus } from '@prisma/client';
import { idSchema, idArraySchema } from '../utils/sharedSchema';

const bookingItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().default(0),
  totalPrice: z.number().nonnegative(),
  equipmentId: idSchema.optional(),
  serviceId: idSchema.optional(),
  kitId: idSchema.optional(),
  itemType: z.enum(['EQUIPMENT', 'SERVICE', 'KIT', 'CUSTOM']).default('EQUIPMENT'),
});

// Schema base (sem refinements)
const bookingBaseSchema = z.object({
  // Cliente (ou user registrado ou dados manuais)
  // aceitar UUIDs ou CUIDs (seed usa cuid())
  userId: idSchema.optional(),
  clientId: idSchema.optional(),
  clientName: z.string().min(1).optional(),
  clientContact: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),

  kitId: idSchema.optional(),
  equipmentIds: idArraySchema.optional(),
  serviceIds: idArraySchema.optional(),
  items: z.array(bookingItemSchema).optional(),

  // Datas do evento (aceita ISO datetime e datetime-local como 'YYYY-MM-DDTHH:mm')
  eventDate: z.string().refine(
    (s) => {
      const parsed = Date.parse(s);
      return !isNaN(parsed);
    },
    { message: 'A data do evento é inválida.' },
  ),
  eventEndDate: z.string().refine(
    (s) => {
      const parsed = Date.parse(s);
      return !isNaN(parsed);
    },
    { message: 'A data final do evento é inválida.' },
  ),

  // Detalhes do evento
  eventTitle: z.string().min(1).optional(),
  eventDuration: z.number().positive().optional(),

  // Endereço
  location: z.string().min(1, 'Local é obrigatório'),
  street: z.string().min(1, 'Rua é obrigatória'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  zipCode: z.string().min(1, 'CEP é obrigatório'),
  addressNumber: z.string().min(1, 'Número é obrigatório'),
  addressComplement: z.string().optional(),

  // Características do local
  requiresStairs: z.boolean().optional().default(false),
  isCovered: z.boolean().optional().default(true),
  hasParking: z.boolean().optional().default(true),

  // Observações e solicitações
  notes: z.string().optional(),
  specialRequests: z.string().optional(),

  // Crew Experience / produção operacional
  technicalRider: z.string().optional(),
  technicalRiderUrl: z.string().url().optional(),
  locationUrl: z.string().url().optional(),
  venueContactName: z.string().optional(),
  venueContactPhone: z.string().optional(),

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
      message:
        'É necessário associar a reserva a um cliente registrado ou fornecer dados de contato.',
      path: ['clientName'],
    },
  )
  .refine(
    (data) => {
      // Garante que pelo menos um kit, equipamentos, serviços ou itens manuais sejam fornecidos
      return (
        data.kitId ||
        (data.equipmentIds && data.equipmentIds.length > 0) ||
        (data.serviceIds && data.serviceIds.length > 0) ||
        (data.items && data.items.length > 0)
      );
    },
    {
      message:
        'É necessário fornecer um kit, equipamentos, serviços ou itens detalhados para o orçamento.',
      path: ['kitId'],
    },
  )
  .refine(
    (data) => {
      // Garante que a data final seja posterior à data inicial
      const startDate = new Date(data.eventDate);
      const endDate = new Date(data.eventEndDate);
      return endDate > startDate;
    },
    {
      message: 'A data final deve ser posterior à data inicial do evento.',
      path: ['eventEndDate'],
    },
  );

// Schema para filtros de busca
// Achado (auditoria — investigando a convenção de paginação do projeto): skip/take não
// existiam aqui, mas bookingController.findAll() já calculava e injetava esses dois campos
// no objeto de filtros antes de chamar bookingCrudService.getAllBookings(filters) — só que
// getAllBookings nunca os lia de volta (bug pré-existente à decomposição em 6 services,
// confirmado no histórico do git). TypeScript não pegou porque a checagem de propriedades
// excedentes só vale para literais de objeto, não para uma variável repassada. Resultado
// real: toda "página" da listagem de reservas retornava o mesmo resultado completo, sem
// paginar de verdade — mesmo a resposta anunciando page/limit/totalPages/hasMore.
export const bookingFiltersSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  deliveryStatus: z.nativeEnum(DeliveryStatus).optional(),
  eventDateFrom: z.date().optional(),
  eventDateTo: z.date().optional(),
  clientId: idSchema.optional(),
  creatorId: idSchema.optional(),
  assigneeId: idSchema.optional(),
  kitId: idSchema.optional(),
  equipmentIds: idArraySchema.optional(),
  skip: z.number().int().nonnegative().optional(),
  take: z.number().int().positive().optional(),
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
  reason: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
});

// Tipos derivados dos schemas
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;
export type BookingStatusUpdateInput = z.infer<typeof bookingStatusUpdateSchema>;
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>;
export type BookingCancelInput = z.infer<typeof bookingCancelSchema>;
