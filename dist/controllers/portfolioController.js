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
exports.PortfolioController = void 0;
const portfolioService = __importStar(require("../services/portfolioService"));
class PortfolioController {
    constructor() {
        this.update = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({ message: "ID é obrigatório." });
                }
                const updated = await portfolioService.updatePortfolio(id, req.body);
                return res.json(updated);
            }
            catch (error) {
                return next(error);
            }
        };
        this.create = async (req, res, next) => {
            try {
                const { title, description, eventDate } = req.body;
                // Validação dos campos obrigatórios
                if (!title || !description || !eventDate) {
                    return res.status(400).json({
                        message: "Campos obrigatórios: title, description, eventDate",
                        received: { title: !!title, description: !!description, eventDate: !!eventDate }
                    });
                }
                const portfolio = await portfolioService.create(req.body);
                return res.status(201).json(portfolio);
            }
            catch (error) {
                if (error instanceof Error) {
                    // Se é um erro conhecido/esperado, retorne 400
                    if (error.message.includes('obrigatórios') || error.message.includes('inválida')) {
                        return res.status(400).json({ message: error.message });
                    }
                }
                // Para outros erros, use o handler de erro padrão
                return next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const items = await portfolioService.findAll();
                return res.json(items);
            }
            catch (error) {
                return next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({ message: "ID é obrigatório." });
                }
                await portfolioService.deletePortfolio(id);
                return res.status(204).send();
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.PortfolioController = PortfolioController;
