"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaqController = void 0;
const faqService_1 = require("../services/faqService");
class FaqController {
    constructor() {
        this.create = async (req, res, next) => {
            try {
                const faqItem = await faqService_1.FaqService.create(req.body);
                return res.status(201).json(faqItem);
            }
            catch (error) {
                return next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const items = await faqService_1.FaqService.findAll();
                return res.json(items);
            }
            catch (error) {
                return next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const { id } = req.params;
                const faqItem = await faqService_1.FaqService.update(id, req.body);
                return res.json(faqItem);
            }
            catch (error) {
                return next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const { id } = req.params;
                await faqService_1.FaqService.delete(id);
                return res.status(204).send();
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.FaqController = FaqController;
