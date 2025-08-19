"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
const bookingService_1 = require("../services/bookingService");
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
const bookingSchema_1 = require("../validators/bookingSchema");
const bookingService = new bookingService_1.BookingService();
class BookingController {
    constructor() {
        this.create = async (req, res, next) => {
            try {
                // Validação do schema
                const validatedData = bookingSchema_1.bookingCreateSchema.parse(req.body);
                // Validação de negócio
                const { kitId, equipmentIds } = validatedData;
                if (!kitId && (!equipmentIds || !Array.isArray(equipmentIds) || equipmentIds.length === 0)) {
                    res.status(400).json({
                        success: false,
                        message: "É necessário fornecer um kit ou uma lista de equipamentos.",
                    });
                    return;
                }
                // Suporte a idempotency: ler header 'Idempotency-Key' ou 'x-idempotency-key'
                const idempotencyKey = (req.header('Idempotency-Key') || req.header('x-idempotency-key'));
                const booking = await bookingService.createBooking(validatedData, req.userId, idempotencyKey);
                res.status(201).json({
                    success: true,
                    message: "Reserva criada com sucesso",
                    data: booking
                });
            }
            catch (error) {
                console.error("Erro no controller create:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.findByUser = async (req, res, next) => {
            try {
                // req.userId is the authenticated user's id; bookings are linked to a client record.
                // Encontrar client vinculado ao userId e buscar reservas pelo client.id
                const client = await prisma_1.prisma.client.findFirst({ where: { userId: req.userId } });
                if (!client) {
                    // Nenhum cliente associado => retornar array vazio
                    return res.json({ success: true, data: [] });
                }
                const bookings = await bookingService.getBookingsByClient(client.id);
                res.json({ success: true, data: bookings });
            }
            catch (error) {
                console.error("Erro no controller findByUser:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const status = req.query.status;
                const userId = req.query.userId;
                const creatorId = req.query.creatorId;
                // Parse dates if provided
                const startDate = req.query.startDate
                    ? new Date(req.query.startDate)
                    : undefined;
                const endDate = req.query.endDate
                    ? new Date(req.query.endDate)
                    : undefined;
                const filters = {
                    status,
                    eventDateFrom: startDate,
                    eventDateTo: endDate,
                    clientId: userId,
                    creatorId
                };
                const bookings = await bookingService.getAllBookings(filters);
                res.json({
                    success: true,
                    data: bookings
                });
            }
            catch (error) {
                console.error("Erro no controller findAll:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.updateStatus = async (req, res, next) => {
            if (req.userRole !== "ADMIN") {
                res.status(403).json({
                    success: false,
                    message: "Acesso negado."
                });
                return;
            }
            try {
                const { id } = req.params;
                const { status } = req.body;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                if (!Object.values(client_1.BookingStatus).includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: "Estado inválido."
                    });
                    return;
                }
                const updatedBooking = await bookingService.updateBookingStatus(id, status);
                res.json({
                    success: true,
                    message: "Status atualizado com sucesso",
                    data: updatedBooking
                });
            }
            catch (error) {
                console.error("Erro no controller updateStatus:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.updateDeliveryStatus = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { status } = req.body;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                if (!Object.values(client_1.DeliveryStatus).includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: "Estado de entrega inválido."
                    });
                    return;
                }
                const updatedBooking = await bookingService.updateDeliveryStatus(id, status);
                res.json({
                    success: true,
                    message: "Status de entrega atualizado com sucesso",
                    data: updatedBooking
                });
            }
            catch (error) {
                console.error("Erro no controller updateDeliveryStatus:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.getCalendarBookings = async (req, res, next) => {
            try {
                const { month, year } = req.query;
                if (!month || !year) {
                    res.status(400).json({
                        success: false,
                        message: "Mês e ano são obrigatórios."
                    });
                    return;
                }
                const events = await bookingService.getCalendar(Number(month), Number(year));
                res.json({
                    success: true,
                    data: events
                });
            }
            catch (error) {
                console.error("Erro no controller getCalendarBookings:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.findOne = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                // Verificar permissões
                if (req.userRole !== "ADMIN") {
                    // Cliente só pode ver suas próprias reservas
                    const booking = await bookingService.getBookingById(id);
                    if (booking.clientId !== req.userId && booking.creatorId !== req.userId) {
                        res.status(403).json({
                            success: false,
                            message: "Acesso negado."
                        });
                        return;
                    }
                }
                const booking = await bookingService.getBookingById(id);
                res.json({
                    success: true,
                    data: booking
                });
            }
            catch (error) {
                console.error("Erro no controller findOne:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.update = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                // Verificar permissões
                if (req.userRole !== "ADMIN") {
                    const booking = await bookingService.getBookingById(id);
                    if (booking.clientId !== req.userId && booking.creatorId !== req.userId) {
                        res.status(403).json({
                            success: false,
                            message: "Acesso negado."
                        });
                        return;
                    }
                }
                const updatedBooking = await bookingService.updateBooking(id, req.body);
                res.json({
                    success: true,
                    message: "Reserva atualizada com sucesso",
                    data: updatedBooking
                });
            }
            catch (error) {
                console.error("Erro no controller update:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        // Adicionar attachment (comprovante) à reserva
        this.addAttachment = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({ success: false, message: 'ID da reserva é obrigatório.' });
                    return;
                }
                // Apenas admin ou criador/cliente podem anexar
                if (req.userRole !== 'ADMIN') {
                    const booking = await bookingService.getBookingById(id);
                    if (booking.clientId !== req.userId && booking.creatorId !== req.userId) {
                        res.status(403).json({ success: false, message: 'Acesso negado.' });
                        return;
                    }
                }
                const { url, filename, mimeType } = req.body;
                if (!url) {
                    res.status(400).json({ success: false, message: 'URL do arquivo é obrigatória.' });
                    return;
                }
                const attachment = await bookingService.addAttachment(id, { url, filename, mimeType });
                res.status(201).json({ success: true, data: attachment });
            }
            catch (error) {
                console.error('Erro ao adicionar attachment:', error);
                if (error instanceof Error) {
                    res.status(400).json({ success: false, message: error.message });
                }
                else
                    next(error);
            }
        };
        this.removeAttachment = async (req, res, next) => {
            try {
                const { id, attachmentId } = req.params;
                if (!id || !attachmentId) {
                    res.status(400).json({ success: false, message: 'ID da reserva e do attachment são obrigatórios.' });
                    return;
                }
                // Autorização: apenas admin, criador ou cliente
                if (req.userRole !== 'ADMIN') {
                    const booking = await bookingService.getBookingById(id);
                    if (booking.clientId !== req.userId && booking.creatorId !== req.userId) {
                        res.status(403).json({ success: false, message: 'Acesso negado.' });
                        return;
                    }
                }
                const removed = await bookingService.removeAttachment(attachmentId);
                res.json({ success: true, data: removed });
            }
            catch (error) {
                console.error('Erro ao remover attachment:', error);
                if (error instanceof Error) {
                    res.status(400).json({ success: false, message: error.message });
                }
                else
                    next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                // Verificar permissões
                if (req.userRole !== "ADMIN") {
                    const booking = await bookingService.getBookingById(id);
                    if (booking.clientId !== req.userId && booking.creatorId !== req.userId) {
                        res.status(403).json({
                            success: false,
                            message: "Acesso negado."
                        });
                        return;
                    }
                }
                await bookingService.deleteBooking(id);
                res.status(204).send();
            }
            catch (error) {
                console.error("Erro no controller delete:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.confirm = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                const booking = await bookingService.confirm(id);
                res.json({
                    success: true,
                    message: "Reserva confirmada com sucesso",
                    data: booking
                });
            }
            catch (error) {
                console.error("Erro no controller confirm:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        // Confirmação com detalhes (valor acordado e atribuição de colaboradores)
        this.confirmWithDetails = async (req, res, next) => {
            if (req.userRole !== 'ADMIN') {
                res.status(403).json({ success: false, message: 'Acesso negado.' });
                return;
            }
            try {
                const { id } = req.params;
                const { totalPrice, collaborators } = req.body;
                if (!id) {
                    res.status(400).json({ success: false, message: 'ID da reserva é obrigatório.' });
                    return;
                }
                const booking = await bookingService.confirmWithDetails(id, { totalPrice, collaborators });
                res.json({ success: true, message: 'Reserva confirmada com detalhes', data: booking });
            }
            catch (error) {
                console.error('Erro no controller confirmWithDetails:', error);
                if (error instanceof Error) {
                    res.status(400).json({ success: false, message: error.message });
                }
                else
                    next(error);
            }
        };
        this.cancel = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        message: "ID da reserva é obrigatório."
                    });
                    return;
                }
                const booking = await bookingService.cancel(id, reason);
                res.json({
                    success: true,
                    message: "Reserva cancelada com sucesso",
                    data: booking
                });
            }
            catch (error) {
                console.error("Erro no controller cancel:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.getUpcoming = async (req, res, next) => {
            try {
                const bookings = await bookingService.getUpcoming(req.userId);
                res.json({
                    success: true,
                    data: bookings
                });
            }
            catch (error) {
                console.error("Erro no controller getUpcoming:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.getHistory = async (req, res, next) => {
            try {
                const bookings = await bookingService.getHistory(req.userId);
                res.json({
                    success: true,
                    data: bookings
                });
            }
            catch (error) {
                console.error("Erro no controller getHistory:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.getDashboardStats = async (req, res, next) => {
            if (req.userRole !== "ADMIN") {
                res.status(403).json({
                    success: false,
                    message: "Acesso negado."
                });
                return;
            }
            try {
                const stats = await bookingService.getDashboardStats();
                res.json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                console.error("Erro no controller getDashboardStats:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        this.getCalendar = async (req, res, next) => {
            try {
                const { month, year } = req.query;
                if (!month || !year) {
                    res.status(400).json({
                        success: false,
                        message: "Mês e ano são obrigatórios."
                    });
                    return;
                }
                const calendar = await bookingService.getCalendar(Number(month), Number(year));
                res.json({
                    success: true,
                    data: calendar
                });
            }
            catch (error) {
                console.error("Erro no controller getCalendar:", error);
                if (error instanceof Error) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                else {
                    next(error);
                }
            }
        };
        // Método legado mantido para compatibilidade
        this.getCollaboratorEvents = async (req, res, next) => {
            try {
                const { collaboratorId } = req.params;
                const { month, year } = req.query;
                if (!collaboratorId) {
                    res.status(400).json({
                        success: false,
                        message: "ID do colaborador é obrigatório."
                    });
                    return;
                }
                // TODO: Implementar getCollaboratorEvents quando sistema de colaboradores estiver completo
                res.json({
                    success: true,
                    message: "Funcionalidade em desenvolvimento",
                    data: { events: [] }
                });
            }
            catch (error) {
                console.error("Erro no controller getCollaboratorEvents:", error);
                next(error);
            }
        };
    }
}
exports.BookingController = BookingController;
