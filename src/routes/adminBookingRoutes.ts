import { createSafeRouter } from "../middlewares/safeRouter";
import { BookingController } from "../controllers/bookingController";

const adminBookingRoutes = createSafeRouter();

// Usar a instância única do controller
const bookingController = new BookingController();

adminBookingRoutes.get("/", bookingController.findAll);
adminBookingRoutes.get("/:id", bookingController.findOne);
adminBookingRoutes.patch("/:id/status", bookingController.updateStatus);
adminBookingRoutes.patch("/:id/delivery-status", bookingController.updateDeliveryStatus);
adminBookingRoutes.get("/calendar", bookingController.getCalendarBookings);

export default adminBookingRoutes;
