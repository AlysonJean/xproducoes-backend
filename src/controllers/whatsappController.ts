
import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsappService';

export class WhatsappController {
  
  getStatus(req: Request, res: Response) {
    const status = whatsappService.getStatus();
    return res.json(status);
  }

  async logout(req: Request, res: Response) {
    const success = await whatsappService.logout();
    if (success) {
      return res.json({ success: true, message: 'WhatsApp desconectado' });
    } else {
      return res.status(500).json({ success: false, message: 'Erro ao desconectar' });
    }
  }

  async restart(req: Request, res: Response) {
    const success = await whatsappService.restart();
    if (success) {
      return res.json({ success: true, message: 'WhatsApp reiniciado' });
    } else {
      return res.status(500).json({ success: false, message: 'Erro ao reiniciar' });
    }
  }
}

export const whatsappController = new WhatsappController();
