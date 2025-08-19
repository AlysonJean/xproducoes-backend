import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/uploadService';

const uploadService = new UploadService();

export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    // Upload para Cloudinary
  const logoUrl = await uploadService.uploadImage(req.file, 'logo');
    if (!logoUrl) {
      return res.status(500).json({ error: 'Falha ao obter URL do logo após upload.' });
    }
    return res.status(200).json({ logoUrl });
  } catch (error: any) {
    console.error('[LogoController] Erro ao enviar logo:', {
      message: error?.message,
      name: error?.name,
    });
    return res.status(500).json({ error: error?.message || 'Erro ao enviar logo.' });
  }
};
