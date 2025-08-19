"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const paymentService = __importStar(require("../services/paymentService"));
class PaymentController {
    constructor() {
        this.createCheckoutSession = async (req, res, next) => {
            try {
                const { bookingId } = req.body;
                if (!bookingId) {
                    return res
                        .status(400)
                        .json({ message: "O ID da reserva é obrigatório." });
                }
                const session = await paymentService.createCheckoutSession(bookingId, req.userId);
                return res.json(session);
            }
            catch (error) {
                return next(error);
            }
        };
        this.handleStripeWebhook = async (req, res, next) => {
            try {
                await paymentService.handleWebhookEvent(req);
                return res.status(200).json({ received: true });
            }
            catch (error) {
                return next(error);
            }
        };
        this.createPaymentIntent = async (req, res, next) => {
            try {
                const { bookingId } = req.params;
                if (!bookingId) {
                    return res.status(400).json({ message: "ID da reserva é obrigatório." });
                }
                const paymentIntent = await paymentService.createPaymentIntent(bookingId);
                return res.json(paymentIntent);
            }
            catch (error) {
                return next(error);
            }
        };
        this.confirmPayment = async (req, res, next) => {
            try {
                const { paymentIntentId } = req.params;
                if (!paymentIntentId) {
                    return res.status(400).json({ message: "ID do payment intent é obrigatório." });
                }
                const payment = await paymentService.confirmPayment(paymentIntentId);
                return res.json(payment);
            }
            catch (error) {
                return next(error);
            }
        };
        this.refund = async (req, res, next) => {
            try {
                const { paymentId } = req.params;
                const { amount } = req.body;
                if (!paymentId) {
                    return res.status(400).json({ message: "ID do pagamento é obrigatório." });
                }
                const refund = await paymentService.refund(paymentId, amount);
                return res.json(refund);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getHistory = async (req, res, next) => {
            try {
                const history = await paymentService.getHistory(req.userId);
                return res.json(history);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getByBooking = async (req, res, next) => {
            try {
                const { bookingId } = req.params;
                if (!bookingId) {
                    return res.status(400).json({ message: "ID da reserva é obrigatório." });
                }
                const payment = await paymentService.getByBooking(bookingId);
                return res.json(payment);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getAllPayments = async (req, res, next) => {
            try {
                const filters = req.query;
                const payments = await paymentService.getAllPayments(filters);
                return res.json(payments);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getPaymentStats = async (req, res, next) => {
            try {
                const stats = await paymentService.getPaymentStats();
                return res.json(stats);
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.PaymentController = PaymentController;
