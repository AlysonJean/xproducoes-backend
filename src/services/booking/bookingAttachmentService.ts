import { BookingNotFoundError } from "../../utils/bookingErrors.js";
import { prisma } from "../../config/prisma.js";
import { bookingCrudService } from "./bookingCrudService.js";

// Anexos/comprovantes de reservas. Extraído de bookingService.ts (antes uma única classe de
// 1351 linhas/25 métodos) na decomposição em 6 services menores. Depende de bookingCrudService
// para validar que a reserva existe antes de anexar um arquivo.
export class BookingAttachmentService {
  private prisma = prisma;

  /**
   * Adiciona um comprovante/attachment à reserva
   */
  async addAttachment(bookingId: string, payload: { url: string; filename?: string; mimeType?: string }) {
    const booking = await bookingCrudService.getBookingById(bookingId);
    if (!booking) throw new BookingNotFoundError();

  const attachment = await this.prisma.bookingAttachment.create({
      data: {
        bookingId,
        url: payload.url,
        filename: payload.filename || undefined,
        mimeType: payload.mimeType || undefined,
      }
    });

    return attachment;
  }

  async removeAttachment(attachmentId: string) {
  const att = await this.prisma.bookingAttachment.delete({ where: { id: attachmentId } });
    return att;
  }
}

export const bookingAttachmentService = new BookingAttachmentService();
