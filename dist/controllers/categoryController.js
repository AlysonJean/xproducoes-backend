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
exports.CategoryController = void 0;
const categoryService = __importStar(require("../services/categoryService"));
const categorySchema_1 = require("../validators/categorySchema");
class CategoryController {
    constructor() {
        this.create = async (req, res, next) => {
            try {
                if (req.userRole !== "ADMIN") {
                    return res.status(403).json({ message: "Acesso negado" });
                }
                categorySchema_1.categoryCreateSchema.parse(req.body);
                const { name } = req.body;
                const category = await categoryService.create({ name });
                return res.status(201).json(category);
            }
            catch (error) {
                return next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const categories = await categoryService.findAll();
                return res.json(categories);
            }
            catch (error) {
                return next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                if (req.userRole !== "ADMIN") {
                    return res.status(403).json({ message: "Acesso negado" });
                }
                categorySchema_1.categoryUpdateSchema.parse(req.body);
                const { id } = req.params;
                const { name } = req.body;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID da categoria é obrigatório." });
                }
                const category = await categoryService.update(id, { name });
                return res.json(category);
            }
            catch (error) {
                return next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                if (req.userRole !== "ADMIN") {
                    return res.status(403).json({ message: "Acesso negado" });
                }
                const { id } = req.params;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID da categoria é obrigatório." });
                }
                await categoryService.deleteCategory(id);
                return res.status(204).send();
            }
            catch (error) {
                return next(error);
            }
        };
        this.getById = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID da categoria é obrigatório." });
                }
                const category = await categoryService.findById(id);
                if (!category) {
                    return res.status(404).json({ message: "Categoria não encontrada." });
                }
                return res.json(category);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getWithEquipmentCount = async (req, res, next) => {
            try {
                const categories = await categoryService.findAllWithEquipmentCount();
                return res.json(categories);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getFeatured = async (req, res, next) => {
            try {
                const categories = await categoryService.findFeatured();
                return res.json(categories);
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.CategoryController = CategoryController;
