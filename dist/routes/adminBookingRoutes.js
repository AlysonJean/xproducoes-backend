"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const adminBookingRoutes = (0, express_1.Router)();
// Usar a instância única do controller
const bookingController = new bookingController_1.BookingController();
adminBookingRoutes.get("/", bookingController.findAll);
adminBookingRoutes.get("/:id", bookingController.findOne);
adminBookingRoutes.patch("/:id/status", bookingController.updateStatus);
adminBookingRoutes.patch("/:id/delivery-status", bookingController.updateDeliveryStatus);
adminBookingRoutes.get("/calendar", bookingController.getCalendarBookings);
exports.default = adminBookingRoutes;
