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
exports.KitController = void 0;
const kitService = __importStar(require("../services/kitService"));
class KitController {
    constructor() {
        this.create = async (req, res, next) => {
            try {
                const data = {
                    ...req.body,
                    price: Number(req.body.price),
                };
                const kit = await kitService.create(data, req.file);
                return res.status(201).json(kit);
            }
            catch (error) {
                return next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const data = { ...req.body };
                if (data.price) {
                    data.price = Number(data.price);
                }
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({ message: "ID é obrigatório." });
                }
                const kit = await kitService.update(id, data, req.file);
                return res.json(kit);
            }
            catch (error) {
                return next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const kits = await kitService.findAll();
                return res.json(kits);
            }
            catch (error) {
                return next(error);
            }
        };
        this.findOne = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({ message: "ID é obrigatório." });
                }
                const kit = await kitService.findOne(id);
                if (!kit) {
                    throw new Error("Kit não encontrado.");
                }
                return res.json(kit);
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
                await kitService.deleteKit(id);
                return res.status(204).send();
            }
            catch (error) {
                return next(error);
            }
        };
        this.getRecommended = async (req, res, next) => {
            try {
                const kits = await kitService.findRecommended();
                return res.json(kits);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getPopular = async (req, res, next) => {
            try {
                const kits = await kitService.findPopular();
                return res.json(kits);
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.KitController = KitController;
