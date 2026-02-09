import { Request, Response } from "express";
import { CollaboratorFunctionService } from "../services/collaboratorFunctionService";

const service = new CollaboratorFunctionService();

export class CollaboratorFunctionController {
  async getAll(req: Request, res: Response) {
    try {
      const functions = await service.getAll();
      res.json(functions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const func = await service.getById(req.params.id as string);
      if (!func) return res.status(404).json({ error: "Function not found" });
      res.json({ success: true, data: func });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const func = await service.create(req.body);
      res.status(201).json({ success: true, data: func });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const func = await service.update(req.params.id as string, req.body);
      res.json({ success: true, data: func });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await service.delete(req.params.id as string);
      res.json({ success: true, message: "Função removida" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
