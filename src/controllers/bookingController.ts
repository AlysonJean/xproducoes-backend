import { Request, Response, NextFunction } from "express";
import { BookingService } from "../services/bookingService";
import { prisma } from "../config/prisma";
import { BookingStatus, DeliveryStatus } from "@prisma/client";
import logger from "../config/logger";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

const bookingService = new BookingService();

export class BookingController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Dados validados pelo middleware Zod
      const validatedData = req.body;


      // Suporte a idempotency
      const idempotencyKey = (req.header('Idempotency-Key') || req.header('x-idempotency-key')) as string | undefined;
      const booking = await bookingService.createBooking(validatedData, req.userId!, idempotencyKey);
      
      return res.status(201).json({
        success: true,
        message: "Reserva criada com sucesso",
        data: booking
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller Booking.create");


      if (error instanceof BadRequestError || error instanceof ForbiddenError || error instanceof NotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.name,
          message: error.message
        });
      }

      // BookingValidationError do Service
      if (error instanceof Error && error.constructor.name === 'BookingValidationError') {
        return res.status(400).json({
          success: false,
          error: "Erro de Negócio",
          message: error.message
        });
      }

      next(error);
    }
  };

  findByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.userId is the authenticated user's id; bookings are linked to a client record.
      // Encontrar client vinculado ao userId e buscar reservas pelo client.id
      const client = await prisma.client.findFirst({ where: { userId: req.userId } });
      if (!client) {
        // Nenhum cliente associado => retornar array vazio
        return res.json({ success: true, data: [] });
      }

      const bookings = await bookingService.getBookingsByClient(client.id);

      res.json({ success: true, data: bookings });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller findByUser");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as BookingStatus | undefined;
      const userId = req.query.userId as string | undefined;
      const creatorId = req.query.creatorId as string | undefined;

      // ✅ Adicionar paginação padrão
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 por página
      const skip = (page - 1) * limit;

      // Parse dates if provided
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const filters = {
        status,
        eventDateFrom: startDate,
        eventDateTo: endDate,
        clientId: userId,
        creatorId,
        skip,
        take: limit
      };

      const bookings = await bookingService.getAllBookings(filters);
      
      // Buscar total para meta
      const total = await bookingService.countBookings({
        status,
        eventDateFrom: startDate,
        eventDateTo: endDate,
        clientId: userId,
        creatorId
      });
      
      res.json({
        success: true,
        data: bookings,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller findAll");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  updateStatus = async (req: Request, res: Response, _next: NextFunction) => {
    if (req.userRole !== "ADMIN") {
      throw new ForbiddenError("Acesso negado.");
    }

    const { id } = req.params as { id: string };
    const { status } = req.body as { status: BookingStatus };

    if (!id) throw new BadRequestError("ID da reserva é obrigatório.");


    const updatedBooking = await bookingService.updateBookingStatus(id, status);
    
    res.json({
      success: true,
      message: "Status atualizado com sucesso",
      data: updatedBooking
    });
  };

  updateDeliveryStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as { status: DeliveryStatus };

      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "ID da reserva é obrigatório." 
        });
        return;
      }



      const updatedBooking = await bookingService.updateDeliveryStatus(id, status);
      
      res.json({
        success: true,
        message: "Status de entrega atualizado com sucesso",
        data: updatedBooking
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller updateDeliveryStatus");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  getCalendarBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month, year } = req.query;
      
      // Parâmetros são opcionais agora
      const monthNum = month ? Number(month) : undefined;
      const yearNum = year ? Number(year) : undefined;
      
      const events = await bookingService.getCalendar(monthNum, yearNum);
      
      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller getCalendarBookings");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  findOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "ID da reserva é obrigatório." 
        });
        return;
      }

      // Verificar permissões usando clientId
      if (req.userRole !== "ADMIN") {
        // Buscar client vinculado ao userId autenticado
        const client = await prisma.client.findFirst({ where: { userId: req.userId } });
        if (!client) {
          res.status(403).json({ 
            success: false,
            message: "Acesso negado. Cliente não encontrado." 
          });
          return;
        }

        // Verificar se a booking pertence ao cliente
        const booking = await bookingService.getBookingById(id);
        if (booking.clientId !== client.id) {
          res.status(403).json({ 
            success: false,
            message: "Acesso negado. Esta reserva não pertence a você." 
          });
          return;
        }
      }

      const booking = await bookingService.getBookingById(id);
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller findOne");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      
      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "ID da reserva é obrigatório." 
        });
        return;
      }

      // Verificar permissões usando clientId
      if (req.userRole !== "ADMIN") {
        const client = await prisma.client.findFirst({ where: { userId: req.userId } });
        if (!client) {
          res.status(403).json({ 
            success: false,
            message: "Acesso negado. Cliente não encontrado." 
          });
          return;
        }

        const booking = await bookingService.getBookingById(id);
        if (booking.clientId !== client.id) {
          res.status(403).json({ 
            success: false,
            message: "Acesso negado. Esta reserva não pertence a você." 
          });
          return;
        }
      }

      // LOG: Mostra o payload recebido na atualização
      logger.info({ payload: req.body }, "[BOOKING UPDATE] Payload recebido");

      const updatedBooking = await bookingService.updateBooking(id, req.body);
      res.json({
        success: true,
        message: "Reserva atualizada com sucesso",
        data: updatedBooking
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller update");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  // Adicionar attachment (comprovante) à reserva
  addAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        res.status(400).json({ success: false, message: 'ID da reserva é obrigatório.' });
        return;
      }

      // Apenas admin ou cliente podem anexar
      if (req.userRole !== 'ADMIN') {
        const client = await prisma.client.findFirst({ where: { userId: req.userId } });
        if (!client) {
          res.status(403).json({ success: false, message: 'Acesso negado. Cliente não encontrado.' });
          return;
        }

        const booking = await bookingService.getBookingById(id);
        if (booking.clientId !== client.id) {
          res.status(403).json({ success: false, message: 'Acesso negado. Esta reserva não pertence a você.' });
          return;
        }
      }

      const { url, filename, mimeType } = req.body as { url: string; filename?: string; mimeType?: string };
      if (!url) {
        res.status(400).json({ success: false, message: 'URL do arquivo é obrigatória.' });
        return;
      }

      const attachment = await bookingService.addAttachment(id, { url, filename, mimeType });

      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao adicionar attachment');
      if (error instanceof Error) {
        res.status(400).json({ success: false, message: error.message });
      } else next(error);
    }
  };

  removeAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, attachmentId } = req.params as { id: string; attachmentId: string };
      if (!id || !attachmentId) {
        res.status(400).json({ success: false, message: 'ID da reserva e do attachment são obrigatórios.' });
        return;
      }

      // Autorização: apenas admin ou cliente
      if (req.userRole !== 'ADMIN') {
        const client = await prisma.client.findFirst({ where: { userId: req.userId } });
        if (!client) {
          res.status(403).json({ success: false, message: 'Acesso negado. Cliente não encontrado.' });
          return;
        }

        const booking = await bookingService.getBookingById(id);
        if (booking.clientId !== client.id) {
          res.status(403).json({ success: false, message: 'Acesso negado. Esta reserva não pertence a você.' });
          return;
        }
      }

      const removed = await bookingService.removeAttachment(attachmentId);
      res.json({ success: true, data: removed });
    } catch (error) {
      logger.error({ err: error }, 'Erro ao remover attachment');
      if (error instanceof Error) {
        res.status(400).json({ success: false, message: error.message });
      } else next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      
      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "ID da reserva é obrigatório." 
        });
        return;
      }

      // Verificar permissões usando clientId
      if (req.userRole !== "ADMIN") {
        const client = await prisma.client.findFirst({ where: { userId: req.userId } });
        if (!client) {
          res.status(403).json({ 
            success: false,
            message: "Acesso negado. Cliente não encontrado." 
          });
          return;
        }

        const booking = await bookingService.getBookingById(id);
        if (booking.clientId !== client.id) {
          res.status(403).json({ 
            success: false,
            message: "Acesso negado. Esta reserva não pertence a você." 
          });
          return;
        }
      }

      await bookingService.deleteBooking(id);
      
      res.status(204).send();
    } catch (error) {
      logger.error({ err: error }, "Erro no controller delete");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  confirm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      
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
    } catch (error) {
      logger.error({ err: error }, "Erro no controller confirm");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  // Confirmação com detalhes (valor acordado e atribuição de colaboradores)
  confirmWithDetails = async (req: Request, res: Response, next: NextFunction) => {
    if (req.userRole !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Acesso negado.' });
      return;
    }
    try {
      const { id } = req.params as { id: string };
      const { totalPrice, collaborators } = req.body as { totalPrice?: number; collaborators?: Array<any> };
      if (!id) {
        res.status(400).json({ success: false, message: 'ID da reserva é obrigatório.' });
        return;
      }

      const booking = await bookingService.confirmWithDetails(id, { totalPrice, collaborators });
      res.json({ success: true, message: 'Reserva confirmada com detalhes', data: booking });
    } catch (error) {
      logger.error({ err: error }, 'Erro no controller confirmWithDetails');
      if (error instanceof Error) {
        res.status(400).json({ success: false, message: error.message });
      } else next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
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
    } catch (error) {
      logger.error({ err: error }, "Erro no controller cancel");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  getUpcoming = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await prisma.client.findFirst({ where: { userId: req.userId } });
      if (!client) {
        return res.json({ success: true, data: [] });
      }

      const bookings = await bookingService.getUpcoming(client.id);
      
      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller getUpcoming");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = await prisma.client.findFirst({ where: { userId: req.userId } });
      if (!client) {
        return res.json({ success: true, data: [] });
      }

      const bookings = await bookingService.getHistory(client.id);
      
      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller getHistory");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      logger.error({ err: error }, "Erro no controller getDashboardStats");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  getCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month, year } = req.query;
      
      // Parâmetros são opcionais agora
      const monthNum = month ? Number(month) : undefined;
      const yearNum = year ? Number(year) : undefined;
      
      const calendar = await bookingService.getCalendar(monthNum, yearNum);
      
      res.json({
        success: true,
        data: calendar
      });
    } catch (error) {
      logger.error({ err: error }, "Erro no controller getCalendar");
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        next(error);
      }
    }
  };

  // Método legado mantido para compatibilidade
  getCollaboratorEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { collaboratorId } = req.params as { collaboratorId: string };


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
    } catch (error) {
      logger.error({ err: error }, "Erro no controller getCollaboratorEvents");
      next(error);
    }
  };
}
