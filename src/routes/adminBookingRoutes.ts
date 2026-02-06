import { Router, type Router as RouterType } from "express";
import { BookingController } from "../controllers/bookingController";

const adminBookingRoutes: RouterType = Router();

// Usar a instância única do controller
const bookingController = new BookingController();

adminBookingRoutes.get("/", bookingController.findAll);
adminBookingRoutes.get("/:id", bookingController.findOne);
adminBookingRoutes.patch("/:id/status", bookingController.updateStatus);
adminBookingRoutes.patch("/:id/delivery-status", bookingController.updateDeliveryStatus);
adminBookingRoutes.get("/calendar", bookingController.getCalendarBookings);

export default adminBookingRoutes;
