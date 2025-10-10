import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/uploadService';
import logger from "../config/logger";


const uploadService = new UploadService();

export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('[LogoController] Starting upload process');
    logger.info({obj:{
      fieldname: req.file?.fieldname,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      encoding: req.file?.encoding
    }}, '[LogoController] Request file info:');

    if (!req.file) {
      logger.error('[LogoController] No file received');
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    logger.info('[LogoController] File validation passed, proceeding to upload');
    // Upload para Cloudinary
    const logoUrl = await uploadService.uploadImage(req.file, 'logo');
    logger.info({obj:logoUrl}, '[LogoController] Upload successful, logoUrl:');

    if (!logoUrl) {
      logger.error('[LogoController] No logoUrl returned from upload service');
      return res.status(500).json({ error: 'Falha ao obter URL do logo após upload.' });
    }

    logger.info('[LogoController] Sending success response');
    return res.status(200).json({ logoUrl });
  } catch (error: any) {
    logger.error({obj:{
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    }}, '[LogoController] Erro ao enviar logo:');
    return res.status(500).json({ error: error?.message || 'Erro ao enviar logo.' });
  }
};
