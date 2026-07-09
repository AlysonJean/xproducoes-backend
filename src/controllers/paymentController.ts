import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { ForbiddenError } from "../utils/errors";

// O gateway de pagamento real (Stripe) ainda não foi integrado — paymentService
// é inteiramente mock (dados fixos). Em vez de fingir sucesso com dados falsos,
// os endpoints respondem 501 explicitamente. A checagem de autorização (dono da
// reserva ou admin) continua ativa mesmo com o recurso desligado, para já estar
// correta no dia em que o gateway real for ligado.
function paymentsNotAvailable(res: Response) {
  return res.status(501).json({
    success: false,
    message: "Pagamentos online ainda não estão disponíveis. Em breve.",
    code: "PAYMENT_NOT_AVAILABLE",
  });
}

async function assertOwnsBooking(req: Request, bookingId: string): Promise<void> {
  if (req.userRole === "ADMIN") return;

  const client = await prisma.client.findFirst({ where: { userId: req.userId } });
  if (!client) {
    throw new ForbiddenError("Acesso negado. Cliente não encontrado.");
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { clientId: true } });
  if (!booking || booking.clientId !== client.id) {
    throw new ForbiddenError("Acesso negado. Esta reserva não pertence a você.");
  }
}

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
          .json({ success: false, message: "O ID da reserva é obrigatório." });
      }
      await assertOwnsBooking(req, bookingId);
      return paymentsNotAvailable(res);
    } catch (error) {
      return next(error);
    }
  };

  // Ponto de integração real preparado para quando o Stripe for adicionado:
  // validar a assinatura do corpo bruto da requisição com STRIPE_WEBHOOK_SECRET
  // (ex.: stripe.webhooks.constructEvent(req.rawBody, signature, secret)) antes
  // de processar qualquer evento. Sem o segredo configurado, não há gateway
  // real por trás — respondemos 503 em vez de aceitar qualquer POST como válido.
  handleStripeWebhook = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return res.status(503).json({
        success: false,
        message: "Webhook de pagamento não configurado.",
        code: "PAYMENT_WEBHOOK_NOT_CONFIGURED",
      });
    }

    // TODO(stripe): const event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    return res.status(503).json({
      success: false,
      message: "Webhook de pagamento não configurado.",
      code: "PAYMENT_WEBHOOK_NOT_CONFIGURED",
    });
  };

  createPaymentIntent = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { bookingId } = req.params as { bookingId: string };

      if (!bookingId) {
        return res.status(400).json({ success: false, message: "ID da reserva é obrigatório." });
      }

      await assertOwnsBooking(req, bookingId);
      return paymentsNotAvailable(res);
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
        return res.status(400).json({ success: false, message: "ID do payment intent é obrigatório." });
      }

      return paymentsNotAvailable(res);
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

      if (!paymentId) {
        return res.status(400).json({ success: false, message: "ID do pagamento é obrigatório." });
      }

      return paymentsNotAvailable(res);
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
      return paymentsNotAvailable(res);
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
        return res.status(400).json({ success: false, message: "ID da reserva é obrigatório." });
      }

      await assertOwnsBooking(req, bookingId);
      return paymentsNotAvailable(res);
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
      return paymentsNotAvailable(res);
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
      return paymentsNotAvailable(res);
    } catch (error) {
      return next(error);
    }
  };
}
