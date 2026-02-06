import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/paymentService";

export class PaymentController {
  createCheckoutSession = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return res
          .status(400)
          .json({ message: "O ID da reserva é obrigatório." });
      }
      const session = await paymentService.createCheckoutSession(
        bookingId,
        req.userId!,
      );
      return res.json(session);
    } catch (error) {
      return next(error);
    }
  };

  handleStripeWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await paymentService.handleWebhookEvent(req);
      return res.status(200).json({ received: true });
    } catch (error) {
      return next(error);
    }
  };

  createPaymentIntent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      
      if (!bookingId) {
        return res.status(400).json({ message: "ID da reserva é obrigatório." });
      }

      const paymentIntent = await paymentService.createPaymentIntent(bookingId);
      return res.json(paymentIntent);
    } catch (error) {
      return next(error);
    }
  };

  confirmPayment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { paymentIntentId } = req.params as { paymentIntentId: string };
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "ID do payment intent é obrigatório." });
      }

      const payment = await paymentService.confirmPayment(paymentIntentId);
      return res.json(payment);
    } catch (error) {
      return next(error);
    }
  };

  refund = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { paymentId } = req.params as { paymentId: string };
      const { amount } = req.body;
      
      if (!paymentId) {
        return res.status(400).json({ message: "ID do pagamento é obrigatório." });
      }

      const refund = await paymentService.refund(paymentId, amount);
      return res.json(refund);
    } catch (error) {
      return next(error);
    }
  };

  getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const history = await paymentService.getHistory(req.userId!);
      return res.json(history);
    } catch (error) {
      return next(error);
    }
  };

  getByBooking = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      
      if (!bookingId) {
        return res.status(400).json({ message: "ID da reserva é obrigatório." });
      }

      const payment = await paymentService.getByBooking(bookingId);
      return res.json(payment);
    } catch (error) {
      return next(error);
    }
  };

  getAllPayments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const filters = req.query;
      const payments = await paymentService.getAllPayments(filters);
      return res.json(payments);
    } catch (error) {
      return next(error);
    }
  };

  getPaymentStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const stats = await paymentService.getPaymentStats();
      return res.json(stats);
    } catch (error) {
      return next(error);
    }
  };
}
