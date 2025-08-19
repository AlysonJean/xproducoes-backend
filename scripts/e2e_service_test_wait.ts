import { BookingService } from '../src/services/bookingService';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import emailService from '../src/services/emailService';

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async function main(){
  try {
    if (emailService && typeof (emailService as any).init === 'function') {
      await (emailService as any).init();
    }
    const bookingService = new BookingService();

    const adminEmail = 'e2e-admin@local';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      admin = await prisma.user.create({ data: { name: 'E2E Admin', email: adminEmail, passwordHash, role: 'ADMIN' } as any });
    }

    const kit = await prisma.kit.findFirst();

    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const bookingPayload: any = {
      kitId: kit?.id,
      eventDate: future.toISOString(),
      eventEndDate: new Date(future.getTime() + 1000 * 60 * 60 * 4).toISOString(),
      clientName: 'E2E Client',
      clientContact: '+5511999999999',
      clientEmail: 'client-e2e@example.com',
      userId: admin!.id,
      location: 'Local Test',
      notes: 'E2E booking test'
    };

    const booking = await bookingService.createBooking(bookingPayload, admin!.id, 'e2e-key-' + Date.now());

    const collUser = await prisma.user.create({ data: { name: 'E2E Collab', email: 'e2e-collab+'+Date.now()+'@local', passwordHash: await bcrypt.hash('Password123!',10), role: 'COLLABORATOR' } as any });
    const collaborator = await prisma.collaborator.create({ data: { userId: collUser.id, collaboratorRole: 'PHOTOGRAPHER', specialties: ['PHOTO'], status: 'ACTIVE', hourlyRate: 100.00 as any } as any });

    const details = { totalPrice: 300.00, collaborators: [ { collaboratorId: collaborator.id, role: 'PHOTOGRAPHER', startTime: '09:00', endTime: '13:00', fixedRate: 150.00 } ] };

    const confirmed = await bookingService.confirmWithDetails(booking.id, details as any);
    console.log('Confirmed booking', confirmed.id, 'status', confirmed.status);

    // wait for async webhook dispatch to complete (background sendWithRetries)
    console.log('Waiting 4s for webhook to be dispatched...');
    await sleep(4000);

    const webhookLogs: any[] = await prisma.$queryRaw`SELECT * FROM "webhook_logs" WHERE "bookingId" = ${booking.id}`;
    console.log('Webhook logs count after wait:', webhookLogs.length);
    for (const w of webhookLogs) console.log(' -', w.id, w.status, w.responseCode, w.attempts);

    process.exit(0);
  } catch (e) {
    console.error('E2E wait test failed', e);
    process.exit(1);
  }
})();
