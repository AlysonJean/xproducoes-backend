import { BookingService } from "../src/services/bookingService";

(async () => {
  const s = new BookingService();
  try {
    const res = await s.getAllBookings();
    console.log('Query success, count =', res.length);
  } catch (e) {
    console.error('Query failed:', e);
    process.exit(1);
  }
  process.exit(0);
})();
