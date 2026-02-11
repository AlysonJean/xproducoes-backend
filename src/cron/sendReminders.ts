
import cron from 'node-cron';
import { prisma } from '../config/prisma';
import logger from '../config/logger';
import emailService from '../services/emailService';
import { generateGoogleCalendarLink } from '../utils/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const startReminderScheduler = () => {
  logger.info('[ReminderScheduler] Starting scheduler (0 * * * *)...');

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    logger.info('[ReminderScheduler] Checking for upcoming bookings...');
    
    // Window: between 23h and 25h from now (targeting ~24h before)
    const now = new Date();
    const startWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const endWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    try {
      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          reminderEmailSent: false,
          eventDate: {
            gte: startWindow,
            lte: endWindow
          },
          client: {
            user: {
              email: { not: undefined } // Ensure email exists
            }
          }
        },
        include: {
          client: {
            include: { user: true }
          },
          equipments: true
        }
      });

      if (bookings.length === 0) {
        logger.info('[ReminderScheduler] No bookings found for reminder.');
        return;
      }

      logger.info({ count: bookings.length }, '[ReminderScheduler] Found bookings needing reminder');

      for (const booking of bookings) {
        if (!booking.client?.user?.email) continue;

        const dateFormatted = format(booking.eventDate, "dd 'de' MMMM", { locale: ptBR });
        const timeFormatted = format(booking.eventDate, "HH:mm");
        
        // Construct detailed location string
        const addressParts = [
            booking.street, 
            booking.addressNumber,
            booking.neighborhood, 
            booking.city
        ].filter(Boolean);
        
        const venueString = booking.location 
            ? `${booking.location}${addressParts.length > 0 ? ` (${addressParts.join(', ')})` : ''}`
            : (addressParts.join(', ') || 'Local a definir');

        // Generate Google Calendar link
        const googleLink = generateGoogleCalendarLink({
            eventTitle: booking.eventTitle || 'Reserva X-Produções',
            eventDate: booking.eventDate,
            venue: venueString,
            equipments: booking.equipments,
            status: booking.status,
            totalPrice: booking.totalPrice
        });

        // Send Email
        await emailService.sendBookingReminder(
            booking.client.user.email,
            booking.client.user.name, // Prisma guarantees string
            {
                id: booking.id,
                title: booking.eventTitle || 'Reserva Confirmada',
                date: dateFormatted,
                time: timeFormatted,
                location: venueString,
                googleCalendarLink: googleLink
            }
        );

        // Mark as sent
        await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderEmailSent: true }
        });

        logger.info({ bookingId: booking.id, email: booking.client.user.email }, '[ReminderScheduler] Reminder sent successfully');
      }

    } catch (error) {
        // Log simplified error structure to avoid massive dumps
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: msg }, '[ReminderScheduler] Job failed');
    }
  });
};
