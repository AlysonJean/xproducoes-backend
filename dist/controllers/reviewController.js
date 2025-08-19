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
exports.ReviewController = void 0;
const reviewService = __importStar(require("../services/reviewService"));
const reviewSchema_1 = require("../validators/reviewSchema");
const client_1 = require("@prisma/client");
class ReviewController {
    async getPublicReviews(req, res, next) {
        try {
            const reviews = await reviewService.findPublicReviews();
            return res.status(200).json(reviews);
        }
        catch (error) {
            return next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const filters = req.query;
            const reviews = await reviewService.findAll(filters);
            return res.status(200).json(reviews);
        }
        catch (error) {
            return next(error);
        }
    }
    async getByEquipment(req, res, next) {
        try {
            const { equipmentId } = req.params;
            const reviews = await reviewService.findByEquipment(equipmentId);
            return res.status(200).json(reviews);
        }
        catch (error) {
            return next(error);
        }
    }
    async getByUser(req, res, next) {
        try {
            const { userId } = req.params;
            const actualUserId = userId === 'me' ? req.userId : userId;
            const reviews = await reviewService.findByUser(actualUserId);
            return res.status(200).json(reviews);
        }
        catch (error) {
            return next(error);
        }
    }
    async create(req, res, next) {
        try {
            if (req.userRole !== 'CLIENT') {
                return res.status(403).json({ message: 'Apenas clientes podem deixar avaliações' });
            }
            // Forçar reviewerId do token e validar payload mínimo
            const parsed = reviewSchema_1.reviewCreateSchema.parse({
                userId: req.userId,
                bookingId: req.body?.bookingId,
                rating: req.body?.rating,
                comment: req.body?.comment,
            });
            const review = await reviewService.create({
                reviewerId: parsed.userId,
                bookingId: parsed.bookingId,
                rating: parsed.rating,
                comment: parsed.comment,
                // Ignorar quaisquer campos de collaboratorId para garantir regra de negócio
            });
            return res.status(201).json(review);
        }
        catch (error) {
            return next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const review = await reviewService.update(id, req.body);
            return res.status(200).json(review);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return res.status(404).json({ message: 'Avaliação não encontrada' });
            }
            return next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await reviewService.deleteReview(id);
            return res.status(204).send();
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return res.status(404).json({ message: 'Avaliação não encontrada' });
            }
            return next(error);
        }
    }
    async approve(req, res, next) {
        try {
            const { id } = req.params;
            const review = await reviewService.approve(id);
            return res.status(200).json(review);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return res.status(404).json({ message: 'Avaliação não encontrada' });
            }
            return next(error);
        }
    }
    async reject(req, res, next) {
        try {
            const { id } = req.params;
            const review = await reviewService.reject(id);
            return res.status(200).json(review);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return res.status(404).json({ message: 'Avaliação não encontrada' });
            }
            return next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await reviewService.getStats();
            return res.status(200).json(stats);
        }
        catch (error) {
            return next(error);
        }
    }
    async getRecent(req, res, next) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const reviews = await reviewService.getRecent(limit);
            return res.status(200).json(reviews);
        }
        catch (error) {
            return next(error);
        }
    }
}
exports.ReviewController = ReviewController;
