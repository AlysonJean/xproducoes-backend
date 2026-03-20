import crypto from 'node:crypto';
import { safeFetch } from '../utils/safeFetch';
import { prisma } from '../config/prisma';
import logger from '../config/logger';

class WebhookService {
  private prisma = prisma;
  private webhookUrl = process.env.BOOKING_CONFIRM_WEBHOOK || '';

  async dispatchBookingConfirmed(booking: any) {
    if (!this.webhookUrl) return;

    const payload = { event: 'booking_confirmed', booking };
    const id = crypto.randomUUID();

    try {
      await (this.prisma as any).webhookLog.create({
        data: {
          id,
          url: this.webhookUrl,
          event: 'booking_confirmed',
          payload: payload as any,
          status: 'SENT',
          bookingId: booking.id
        }
      });
    } catch (e) {
      // Fallback: usar raw SQL seguro apenas se Prisma falhar
      logger.warn('Prisma WebhookLog.create failed, skipping fallback: ' + String(e));
      // Não fazemos fallback com raw SQL por questões de segurança
    }

    void this.sendWithRetries(id, payload, 1);
  }

  private async sendWithRetries(logId: string, payload: any, attempt: number) {
    const maxAttempts = 3;
    const backoffMs = Math.min(Math.pow(2, attempt) * 1000, 30 * 1000); // Max 30s cap

    try {
      const res = await safeFetch(this.webhookUrl, {
        allowedHosts: new Set([new URL(this.webhookUrl).hostname]),
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      });
      const text = await res.text();

      try {
        await (this.prisma as any).webhookLog.update({
          where: { id: logId },
          data: {
            responseCode: res.status,
            responseBody: text,
            status: res.ok ? 'OK' : 'ERROR',
            attempts: { increment: 1 }
          }
        });
      } catch (e) {
        // Se Prisma falhar, apenas logamos o erro - não usamos raw SQL inseguro
        logger.error({ error: e, logId, status: res.status }, 'Failed to update webhook_log after response');
      }

      if (!res.ok && attempt < maxAttempts) {
        setTimeout(() => void this.sendWithRetries(logId, payload, attempt + 1), backoffMs);
      }
    } catch (err) {
    logger.warn('Failed to call webhook: ' + String(err));
      try {
        await (this.prisma as any).webhookLog.update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            responseBody: String(err),
            attempts: { increment: 1 }
          }
        });
      } catch (e) {
        // Se Prisma falhar, apenas logamos o erro - não usamos raw SQL inseguro
        logger.error({ error: e, logId, originalError: String(err) }, 'Failed to update webhook_log on error');
      }

      if (attempt < maxAttempts) {
        setTimeout(() => void this.sendWithRetries(logId, payload, attempt + 1), backoffMs);
      }
    }
  }
}

export default new WebhookService();
