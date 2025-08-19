"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentController = void 0;
const equipmentService_1 = require("../services/equipmentService");
const equipmentSchema_1 = require("../validators/equipmentSchema");
const equipmentService = new equipmentService_1.EquipmentService();
class EquipmentController {
    constructor() {
        this.create = async (req, res, next) => {
            try {
                if (req.userRole !== "ADMIN") {
                    return res.status(403).json({ message: "Acesso negado" });
                }
                if (!req.file) {
                    return res
                        .status(400)
                        .json({ message: "Ficheiro de imagem é obrigatório" });
                }
                const data = {
                    ...req.body,
                    pricePerHour: Number(req.body.pricePerHour),
                    quantity: Number(req.body.quantity),
                };
                equipmentSchema_1.equipmentCreateSchema.parse(data);
                const equipment = await equipmentService.create(data, req.file);
                // Invalidar cache após criar equipamento
                // invalidateCache.onEquipmentChange(); // Função removida/inexistente
                return res
                    .status(201)
                    .json({ equipment, message: "Equipamento criado com sucesso" });
            }
            catch (error) {
                return next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                if (req.userRole !== "ADMIN") {
                    throw new Error("Acesso negado");
                }
                const data = { ...req.body };
                if (data.pricePerHour)
                    data.pricePerHour = Number(data.pricePerHour);
                if (data.quantity)
                    data.quantity = Number(data.quantity);
                equipmentSchema_1.equipmentCreateSchema.partial().parse(data);
                const { id } = req.params;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID do equipamento é obrigatório." });
                }
                const equipment = await equipmentService.update(id, data, req.file);
                // Invalidar cache após atualizar equipamento
                // invalidateCache.onEquipmentChange(); // Função removida/inexistente
                return res.json(equipment);
            }
            catch (error) {
                return next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const equipments = await equipmentService.findAll();
                return res.json(equipments);
            }
            catch (error) {
                return next(error);
            }
        };
        this.findOne = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID do equipamento é obrigatório." });
                }
                const equipment = await equipmentService.findOne(id);
                if (!equipment) {
                    return res.status(404).json({ message: "Equipamento não encontrado." });
                }
                return res.json(equipment);
            }
            catch (error) {
                return next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                if (req.userRole !== "ADMIN") {
                    throw new Error("Acesso negado");
                }
                const { id } = req.params;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID do equipamento é obrigatório." });
                }
                await equipmentService.delete(id);
                return res.status(204).send();
            }
            catch (error) {
                return next(error);
            }
        };
        this.getAvailability = async (req, res, next) => {
            try {
                const { id } = req.params;
                const { month, year } = req.query;
                if (!id) {
                    return res
                        .status(400)
                        .json({ message: "ID do equipamento é obrigatório." });
                }
                if (!month || !year) {
                    return res.status(400).json({ message: "Mês e ano são obrigatórios." });
                }
                const availability = await equipmentService.getAvailability(id, Number(month), Number(year));
                return res.json(availability);
            }
            catch (error) {
                return next(error);
            }
        };
        this.search = async (req, res, next) => {
            try {
                const equipments = await equipmentService.search(req.query);
                return res.json(equipments);
            }
            catch (error) {
                return next(error);
            }
        };
        this.getByCategory = async (req, res, next) => {
            try {
                const { categoryId } = req.params;
                if (!categoryId) {
                    return res
                        .status(400)
                        .json({ message: "ID da categoria é obrigatório." });
                }
                const equipments = await equipmentService.findByCategory(categoryId);
                return res.json(equipments);
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.EquipmentController = EquipmentController;
