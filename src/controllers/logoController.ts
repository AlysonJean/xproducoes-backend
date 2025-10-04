import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/uploadService';

const uploadService = new UploadService();

export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[LogoController] Starting upload process');
    console.log('[LogoController] Request file info:', {
      fieldname: req.file?.fieldname,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      encoding: req.file?.encoding
    });

    if (!req.file) {
      console.error('[LogoController] No file received');
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    console.log('[LogoController] File validation passed, proceeding to upload');
    // Upload para Cloudinary
    const logoUrl = await uploadService.uploadImage(req.file, 'logo');
    console.log('[LogoController] Upload successful, logoUrl:', logoUrl);

    if (!logoUrl) {
      console.error('[LogoController] No logoUrl returned from upload service');
      return res.status(500).json({ error: 'Falha ao obter URL do logo após upload.' });
    }

    console.log('[LogoController] Sending success response');
    return res.status(200).json({ logoUrl });
  } catch (error: any) {
    console.error('[LogoController] Erro ao enviar logo:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    return res.status(500).json({ error: error?.message || 'Erro ao enviar logo.' });
  }
};
