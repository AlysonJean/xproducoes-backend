"use strict";
// Caminho: backend/src/controllers/contactController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const contactService_1 = require("../services/contactService");
const contactService = new contactService_1.ContactService();
class ContactController {
    constructor() {
        // Rota Pública
        this.submitForm = async (req, res, next) => {
            try {
                const submission = await contactService.createSubmission(req.body);
                return res.status(201).json(submission);
            }
            catch (error) {
                return next(error);
            }
        };
        // Rotas de Admin
        this.getAll = async (req, res, next) => {
            try {
                const submissions = await contactService.getAllSubmissions();
                return res.json(submissions);
            }
            catch (error) {
                return next(error);
            }
        };
        this.markAsRead = async (req, res, next) => {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({ error: "ID é obrigatório" });
                }
                const updatedSubmission = await contactService.markAsRead(id);
                return res.json(updatedSubmission);
            }
            catch (error) {
                return next(error);
            }
        };
    }
}
exports.ContactController = ContactController;
