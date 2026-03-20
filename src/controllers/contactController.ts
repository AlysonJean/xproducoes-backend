// Caminho: backend/src/controllers/contactController.ts

import { Request, Response, NextFunction } from "express";
import { ContactService } from "../services/contactService";
import { z } from "zod";
import { ValidationError } from "../errors/AppError";

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
      const validation = contactSchema.safeParse(req.body);
      if (!validation.success) {
        const firstError = validation.error.issues[0]?.message || 'Dados inválidos';
        return next(new ValidationError(firstError));
      }

      const validatedData = validation.data;
      const submission = await contactService.createSubmission(validatedData);
      return res.status(201).json({ success: true, data: submission });
    } catch (error) {
      return next(error);
    }
  };

  // Rotas de Admin
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submissions = await contactService.getAllSubmissions();
      return res.json({ success: true, data: submissions });
    } catch (error) {
      return next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        return res.status(400).json({ success: false, message: "ID é obrigatório" });
      }
      const updatedSubmission = await contactService.markAsRead(id);
      return res.json({ success: true, data: updatedSubmission });
    } catch (error) {
      return next(error);
    }
  };
}
