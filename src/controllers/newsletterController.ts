import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { z } from 'zod';
import logger from '../config/logger';

export class NewsletterController {
  async subscribe(req: Request, res: Response): Promise<void> {
    const schema = z.object({
      email: z.string().email(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ success: false, message: 'Email inválido' });
      return;
    }

    try {
      const { email } = validation.data;

      const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email },
      });

      if (existing) {
        if (!existing.isActive) {
          // Reactivate if needed
          await prisma.newsletterSubscriber.update({
            where: { email },
            data: { isActive: true },
          });
          res.json({ success: true, message: 'Inscrição reativada com sucesso!' });
          return;
        }
        res.status(400).json({ success: false, message: 'Email já cadastrado.' });
        return;
      }

      await prisma.newsletterSubscriber.create({
        data: { email },
      });

      res.status(201).json({ success: true, message: 'Inscrição realizada com sucesso!' });
    } catch (error) {
      logger.error({ err: error }, 'Newsletter subscribe error');
      res.status(500).json({ success: false, message: 'Erro interno ao processar inscrição' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: subscribers });
    } catch (error) {
      logger.error({ err: error }, 'Newsletter list error');
      res.status(500).json({ success: false, message: 'Erro ao listar inscritos' });
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
     res.status(501).json({ success: false, message: 'Not implemented' });
  }
}

export const newsletterController = new NewsletterController();
