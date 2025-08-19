"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const prisma_1 = require("../config/prisma");
const logger_1 = __importDefault(require("../config/logger"));
// use runtime UUID generation to avoid requiring new deps at build time
class WebhookService {
    constructor() {
        this.prisma = prisma_1.prisma;
        this.webhookUrl = process.env.BOOKING_CONFIRM_WEBHOOK || '';
    }
    async dispatchBookingConfirmed(booking) {
        if (!this.webhookUrl)
            return;
        const payload = { event: 'booking_confirmed', booking };
        const payloadJson = JSON.stringify(payload);
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('uuid').v4();
        try {
            await this.prisma.webhookLog.create({
                data: {
                    id,
                    url: this.webhookUrl,
                    event: 'booking_confirmed',
                    payload: payload,
                    status: 'SENT',
                    bookingId: booking.id
                }
            });
        }
        catch (e) {
            try {
                const safeUrl = this.webhookUrl.replace(/'/g, "''");
                await this.prisma.$executeRawUnsafe(`INSERT INTO "webhook_logs" (id, url, event, payload, status, "bookingId", "createdAt", "updatedAt") VALUES ('${id}', '${safeUrl}', 'booking_confirmed', '${payloadJson.replace(/'/g, "''")} '::jsonb, 'SENT', '${booking.id}', now(), now())`);
            }
            catch (e2) {
                logger_1.default.warn('Failed to persist initial webhook_log: ' + String(e2));
            }
        }
        void this.sendWithRetries(id, payload, 1);
    }
    async sendWithRetries(logId, payload, attempt) {
        const maxAttempts = 3;
        const backoffMs = Math.pow(2, attempt) * 1000;
        try {
            const res = await (0, node_fetch_1.default)(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const text = await res.text();
            try {
                await this.prisma.webhookLog.update({
                    where: { id: logId },
                    data: {
                        responseCode: res.status,
                        responseBody: text,
                        status: res.ok ? 'OK' : 'ERROR',
                        attempts: { increment: 1 }
                    }
                });
            }
            catch (e) {
                try {
                    await this.prisma.$executeRawUnsafe(`UPDATE "webhook_logs" SET "responseCode" = ${res.status}, "responseBody" = '${text.replace(/'/g, "''")}', status = '${res.ok ? 'OK' : 'ERROR'}', attempts = COALESCE(attempts, 0) + 1, "updatedAt" = now() WHERE id = '${logId}'`);
                }
                catch (e2) {
                    logger_1.default.warn('Failed to update webhook_log after response: ' + String(e2));
                }
            }
            if (!res.ok && attempt < maxAttempts) {
                setTimeout(() => void this.sendWithRetries(logId, payload, attempt + 1), backoffMs);
            }
        }
        catch (err) {
            logger_1.default.warn('Failed to call webhook: ' + String(err));
            try {
                await this.prisma.webhookLog.update({
                    where: { id: logId },
                    data: {
                        status: 'FAILED',
                        responseBody: String(err),
                        attempts: { increment: 1 }
                    }
                });
            }
            catch (e) {
                try {
                    await this.prisma.$executeRawUnsafe(`UPDATE "webhook_logs" SET status = 'FAILED', "responseBody" = '${String(err).replace(/'/g, "''")}', attempts = COALESCE(attempts, 0) + 1, "updatedAt" = now() WHERE id = '${logId}'`);
                }
                catch (e2) {
                    logger_1.default.warn('Failed to update webhook_log on error: ' + String(e2));
                }
            }
            if (attempt < maxAttempts) {
                setTimeout(() => void this.sendWithRetries(logId, payload, attempt + 1), backoffMs);
            }
        }
    }
}
exports.default = new WebhookService();
