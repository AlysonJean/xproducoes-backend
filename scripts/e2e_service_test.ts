import { BookingService } from '../src/services/bookingService';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import emailService from '../src/services/emailService';

(async function main(){
  try {
    // ensure email service initialized (Ethereal account created if requested)
    if (emailService && typeof (emailService as any).init === 'function') {
      await (emailService as any).init();
    }
    const bookingService = new BookingService();

    // Ensure admin user exists
    const adminEmail = 'e2e-admin@local';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      admin = await prisma.user.create({ data: { name: 'E2E Admin', email: adminEmail, passwordHash, role: 'ADMIN' } as any });
      console.log('Admin created', admin.id);
    } else {
      console.log('Admin exists', admin.id);
    }

    // Ensure a kit exists
    let kit = await prisma.kit.findFirst();
    if (!kit) {
      kit = await prisma.kit.create({ data: { name: 'E2E Kit', price: 100.00 as any, imageUrl: '', description: 'Test kit' } as any });
      console.log('Kit created', kit.id);
    } else {
      console.log('Kit exists', kit.id);
    }

    // Create booking
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const bookingPayload: any = {
      kitId: kit.id,
      eventDate: future.toISOString(),
      eventEndDate: new Date(future.getTime() + 1000 * 60 * 60 * 4).toISOString(),
  clientName: 'E2E Client',
  clientContact: '+5511999999999',
  clientEmail: 'client-e2e@example.com',
  userId: admin.id,
      location: 'Local Test',
      notes: 'E2E booking test'
    };

    console.log('Creating booking via BookingService...');
    const booking = await bookingService.createBooking(bookingPayload, admin.id, 'e2e-key-' + Date.now());
    console.log('Booking created:', booking.id, 'status:', booking.status);

    // Create a collaborator to assign
    const collUser = await prisma.user.create({ data: { name: 'E2E Collab', email: 'e2e-collab+'+Date.now()+'@local', passwordHash: await bcrypt.hash('Password123!',10), role: 'COLLABORATOR' } as any });
    const collaborator = await prisma.collaborator.create({ data: { userId: collUser.id, collaboratorRole: 'PHOTOGRAPHER', specialties: ['PHOTO'], status: 'ACTIVE', hourlyRate: 100.00 as any } as any });
    console.log('Collaborator created', collaborator.id);

    // Confirm with details
    const details = {
      totalPrice: 300.00,
      collaborators: [
        { collaboratorId: collaborator.id, role: 'PHOTOGRAPHER', startTime: '09:00', endTime: '13:00', fixedRate: 150.00 }
      ]
    };

    console.log('Confirming booking with details...');
    const confirmed = await bookingService.confirmWithDetails(booking.id, details as any);
    console.log('Booking confirmed:', confirmed.id, 'status:', confirmed.status, 'totalPrice:', confirmed.totalPrice);

    // Query assigned event collaborators
    const assignments = await prisma.eventCollaborator.findMany({ where: { bookingId: booking.id } });
    console.log('Event collaborators count:', assignments.length);
    for (const a of assignments) console.log(' -', a.id, a.collaboratorId, a.role, a.totalPayment);

    // Query webhook logs (if any)
  const webhookLogs: any[] = await prisma.$queryRaw`SELECT * FROM "webhook_logs" WHERE "bookingId" = ${booking.id}`;
  console.log('Webhook logs count:', webhookLogs.length);
  for (const w of webhookLogs) console.log(' -', w.id, w.status, w.responseCode, w.attempts);

    process.exit(0);
  } catch (e) {
    console.error('E2E service test failed', e);
    process.exit(1);
  }
})();
