// Caminho: backend/src/controllers/contactController.ts

import { Request, Response, NextFunction } from "express";
import { ContactService } from "../services/contactService";
import { z } from "zod";

const contactService = new ContactService();

const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().email("E-mail inválido").max(150, "E-mail muito longo"),
  message: z.string().min(10, "Mensagem curta demais").max(2000, "A mensagem excede o limite permitido"),
});

export class ContactController {
  // Rota Pública
  submitForm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = contactSchema.parse(req.body);
      const submission = await contactService.createSubmission(validatedData);
      return res.status(201).json(submission);
    } catch (error) {
      return next(error);
    }
  };

  // Rotas de Admin
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submissions = await contactService.getAllSubmissions();
      return res.json(submissions);
    } catch (error) {
      return next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        return res.status(400).json({ error: "ID é obrigatório" });
      }
      const updatedSubmission = await contactService.markAsRead(id);
      return res.json(updatedSubmission);
    } catch (error) {
      return next(error);
    }
  };
}
