import { Request, Response } from "express";
import { CollaboratorFunctionService } from "../services/collaboratorFunctionService";
import logger from "../config/logger";

const service = new CollaboratorFunctionService();

export class CollaboratorFunctionController {
  async getAll(req: Request, res: Response) {
    try {
      const functions = await service.getAll();
      res.json(functions);
    } catch (error) {
      logger.error({ err: error }, "Erro ao listar funções");
      res.status(500).json({ success: false, message: "Erro interno ao listar funções" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const func = await service.getById(req.params.id as string);
      if (!func) return res.status(404).json({ success: false, message: "Função não encontrada" });
      res.json({ success: true, data: func });
    } catch (error) {
      logger.error({ err: error }, "Erro ao buscar função");
      res.status(500).json({ success: false, message: "Erro interno ao buscar função" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const func = await service.create(req.body);
      res.status(201).json({ success: true, data: func });
    } catch (error) {
      logger.error({ err: error }, "Erro ao criar função");
      res.status(500).json({ success: false, message: "Erro interno ao criar função" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const func = await service.update(req.params.id as string, req.body);
      res.json({ success: true, data: func });
    } catch (error) {
      logger.error({ err: error }, "Erro ao atualizar função");
      res.status(500).json({ success: false, message: "Erro interno ao atualizar função" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await service.delete(req.params.id as string);
      res.json({ success: true, message: "Função removida" });
    } catch (error) {
      logger.error({ err: error }, "Erro ao remover função");
      res.status(500).json({ success: false, message: "Erro interno ao remover função" });
    }
  }
}
