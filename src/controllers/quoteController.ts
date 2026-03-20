import { Request, Response } from "express";
import { z } from "zod";
import logger from "../config/logger";

// Validação para criação de quote
const createQuoteSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  company: z.string().optional(),
  eventType: z.string().min(1, "Tipo de evento é obrigatório"),
  eventDate: z.string().min(1, "Data do evento é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  equipment: z.array(z.string()).optional(),
  budget: z.string().optional(),
});

// Validação para atualização de status
const updateStatusSchema = z.object({
  status: z.enum(["pending", "in_review", "approved", "rejected", "expired"]),
});

// Validação para resposta ao quote
const respondSchema = z.object({
  message: z.string().min(1, "Mensagem é obrigatória"),
  price: z.number().positive("Preço deve ser positivo").optional(),
  details: z.string().optional(),
  validUntil: z.string().optional(),
});

export class QuoteController {
  /**
   * Submeter novo quote
   */
  async submit(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createQuoteSchema.parse(req.body);

      // Simular armazenamento (substituir por implementação real)
      const quote = {
        id: `quote_${Date.now()}`,
        ...validatedData,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      logger.info("Quote submitted: " + JSON.stringify({ quoteId: quote.id, email: validatedData.email, eventType: validatedData.eventType }));

      res.status(201).json({
        success: true,
        message: "Quote submitted successfully",
        data: quote,
      });
    } catch (error) {
      logger.error("Error submitting quote: " + String(error));
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Listar todos os quotes (admin)
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Simular busca (substituir por implementação real)
      const quotes = [
        {
          id: "quote_1",
          name: "João Silva",
          email: "joao@example.com",
          eventType: "Casamento",
          eventDate: "2024-06-15",
          status: "pending",
          createdAt: "2024-01-15T10:00:00Z",
        },
      ];

      res.json({
        success: true,
        data: quotes,
        total: quotes.length,
      });
    } catch (error) {
      logger.error("Error fetching quotes: " + String(error));
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Buscar quote por ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      // Simular busca (substituir por implementação real)
      const quote = {
        id,
        name: "João Silva",
        email: "joao@example.com",
        phone: "(31) 98925-2272",
        company: "Empresa XYZ",
        eventType: "Casamento",
        eventDate: "2024-06-15",
        location: "São Paulo, SP",
        description: "Casamento com 150 convidados",
        equipment: ["camera1", "lens1", "light1"],
        budget: "R$ 5.000",
        status: "pending",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      };

      if (!quote) {
        res.status(404).json({
          success: false,
          message: "Quote not found",
        });
        return;
      }

      res.json({
        success: true,
        data: quote,
      });
    } catch (error) {
      logger.error("Error fetching quote: " + JSON.stringify({ error: String(error), quoteId: req.params.id }));
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Atualizar status do quote
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { status } = updateStatusSchema.parse(req.body);

      // Simular atualização (substituir por implementação real)
      const updatedQuote = {
        id,
        status,
        updatedAt: new Date().toISOString(),
      };

      logger.info("Quote status updated: " + JSON.stringify({ quoteId: id, newStatus: status, updatedBy: req.user?.id }));

      res.json({
        success: true,
        message: "Quote status updated successfully",
        data: updatedQuote,
      });
    } catch (error) {
      logger.error("Error updating quote status: " + JSON.stringify({ error: String(error), quoteId: req.params.id }));

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Responder ao quote
   */
  async respond(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const validatedData = respondSchema.parse(req.body);

      // Simular resposta (substituir por implementação real)
      const response = {
        id: `response_${Date.now()}`,
        quoteId: id,
        ...validatedData,
        respondedBy: req.user?.id,
        respondedAt: new Date().toISOString(),
      };

      logger.info("Quote response sent: " + JSON.stringify({ quoteId: id, responseId: response.id, respondedBy: req.user?.id }));

      res.json({
        success: true,
        message: "Response sent successfully",
        data: response,
      });
    } catch (error) {
      logger.error("Error responding to quote: " + JSON.stringify({ error: String(error), quoteId: req.params.id }));

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
