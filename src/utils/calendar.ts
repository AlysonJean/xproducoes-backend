
/**
 * Gera um link para adicionar evento ao Google Calendar
 * Formato: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...
 */
export function generateGoogleCalendarLink(booking: {
  eventTitle?: string;
  eventDate: Date;
  venue?: { street?: string; city?: string } | string; // Suporta objeto ou string antiga
  equipments?: ({ equipment: { name: string } } | { name: string })[];
  status?: string;
  totalPrice?: any;
}): string {
  const start = new Date(booking.eventDate);
  const duration = 4; // horas padrão
  const end = new Date(start.getTime() + duration * 3600 * 1000);

  const formatGCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const title = booking.eventTitle || 'Reserva X-Produções';
  
  let location = '';
  if (typeof booking.venue === 'string') {
    location = booking.venue;
  } else if (booking.venue) {
    location = [booking.venue.street, booking.venue.city].filter(Boolean).join(', ');
  }

  const equipNames = (booking.equipments || [])
    .map((e) => (e as any).equipment?.name || (e as any).name || '')
    .filter(Boolean)
    .join(', ');

  const details = [
    equipNames ? `Equipamentos: ${equipNames}` : '',
    `Status: ${booking.status}`,
    `Valor: R$ ${Number(booking.totalPrice || 0).toFixed(2)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGCal(start)}/${formatGCal(end)}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
