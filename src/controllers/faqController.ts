import { Request, Response, NextFunction } from "express";
import { FaqService } from "../services/faqService";

export class FaqController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const faqItem = await FaqService.create(req.body);
      return res.status(201).json({ success: true, data: faqItem });
    } catch (error) {
      return next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FaqService.findAll();
      return res.json({ success: true, data: items });
    } catch (error) {
      return next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const faqItem = await FaqService.update(id, req.body);
      return res.json({ success: true, data: faqItem });
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      await FaqService.delete(id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
