
import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { googleCalendarService } from '../services/googleCalendarService';
import { prisma } from '../config/prisma';
import logger from '../config/logger';

const syncBookingInclude = {
  equipments: true,
  client: true,
} satisfies Prisma.BookingInclude;

// Inicia o fluxo OAuth
// Retorna JSON com a URL para o frontend redirecionar
export async function connect(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).userId; // Compatibilidade com middlewares diferentes
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const url = googleCalendarService.generateAuthUrl(userId);
    return res.json({ url });
  } catch (error) {
    logger.error('Google Connect Error', error);
    return res.status(500).json({ error: 'Erro ao gerar URL de autenticação' });
  }
}

// Callback do Google (fluxo OAuth server-side)
// O Google redireciona o browser para cá
export async function callback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Parâmetros inválidos');
    }

    const userId = String(state);
    
    await googleCalendarService.handleCallback(String(code), userId);

    // Redireciona de volta para o frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/cliente/perfil?google_connected=true`);

  } catch (error) {
    logger.error('Google Callback Error', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/cliente/perfil?google_error=true`);
  }
}

export async function disconnect(req: Request, res: Response) {
  try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await googleCalendarService.disconnect(userId);
      return res.json({ success: true });
  } catch (error) {
      logger.error('Google Disconnect Error', error);
      return res.status(500).json({ error: 'Erro ao desconectar' });
  }
}

export async function syncBooking(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id || (req as any).userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!id) return res.status(400).json({ error: 'ID da reserva é obrigatório' });

        const booking = await prisma.booking.findUnique({
            where: { id },
      include: syncBookingInclude
        });

        if (!booking) return res.status(404).json({ error: 'Reserva não encontrada' });
        
        // Verificar permissão: dono da booking ou cliente associado
        let hasPermission = false;
        
        if (booking.creatorId === userId) hasPermission = true;
        else if (booking.clientId) {
            const client = await prisma.client.findUnique({ where: { id: booking.clientId }});
            if (client?.userId === userId) hasPermission = true;
        }

        if (!hasPermission) {
            return res.status(403).json({ error: 'Sem permissão para sincronizar esta reserva' });
        }

        // Endereço formatado
        const addressParts = [
          booking.street, 
          booking.addressNumber,
          booking.neighborhood, 
          booking.city
        ].filter(Boolean);
        
        const venueString = booking.location 
            ? `${booking.location}${addressParts.length > 0 ? ` (${addressParts.join(', ')})` : ''}`
            : (addressParts.join(', ') || 'Local a definir');

        // Montar objeto de evento
        const eventData = {
            title: booking.eventTitle || 'Reserva X-Produções',
          description: `Reserva #${booking.id.substring(0,8)}\nStatus: ${booking.status}\n\nDetalhes:\n${booking.equipments.map((equipment) => `- ${equipment.name || 'Item'}`).join('\n')}`,
            location: venueString,
            startDate: booking.eventDate,
            endDate: booking.eventEndDate || new Date(booking.eventDate.getTime() + 4 * 3600 * 1000)
        };

        const event = await googleCalendarService.createEvent(userId, eventData);
        
        if (!event) {
            return res.status(400).json({ error: 'Não foi possível sincronizar. Verifique se sua conta Google está conectada no perfil.' });
        }

        return res.json({ success: true, eventId: event.id, htmlLink: event.htmlLink });

    } catch (error) {
        logger.error('Sync Booking Error', error);
        return res.status(500).json({ error: 'Erro ao sincronizar reserva' });
    }
}
