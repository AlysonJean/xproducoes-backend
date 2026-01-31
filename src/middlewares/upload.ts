import { Request, Response, NextFunction } from 'express';
import multer from "multer";
import { UploadService } from '../services/uploadService';
import logger from "../config/logger";


const uploadService = new UploadService();

// Middleware para upload de uma única imagem
export const uploadSingle = (fieldName: string = 'image') => {
  // Sempre usar Cloudinary
  const multerConfig = uploadService.getCloudinaryMulterConfig();
  
  const middleware = multerConfig.single(fieldName);
  
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info(`[UploadMiddleware] Processing ${fieldName} upload`);
    logger.info({obj:{
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    }}, '[UploadMiddleware] Request headers:');
    
    middleware(req, res, (err: any) => {
      if (err) {
        logger.error({obj:{
          name: err.name,
          message: err.message,
          code: err.code
        }}, '[UploadMiddleware] Multer error:');
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 5MB.' });
          }
          return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        }
        
        // Erro de validação de tipo de arquivo
        return res.status(400).json({ error: err.message || 'Tipo de arquivo não permitido.' });
      }
      
      logger.info({obj:{
        fieldname: req.file?.fieldname,
        originalname: req.file?.originalname,
        mimetype: req.file?.mimetype,
        size: req.file?.size
      }}, '[UploadMiddleware] File processed successfully:');
      
      next();
    });
  };
};

// Middleware para upload de múltiplas imagens
export const uploadMultiple = (fieldName: string = 'images', maxFiles: number = 5) => {
  // Sempre usar Cloudinary
  const multerConfig = uploadService.getCloudinaryMulterConfig();
  
  return multerConfig.array(fieldName, maxFiles);
};

// Middleware para upload de avatar
export const uploadAvatar = uploadSingle('avatar');

// Middleware para processamento após upload
export const processUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folder, fileName } = req.body;
    
    if (req.file) {
      // Upload de arquivo único
      const imageUrl = await uploadService.uploadImage(req.file, folder, fileName);
      req.body.imageUrl = imageUrl;
    } else if (req.files && Array.isArray(req.files)) {
      // Upload de múltiplos arquivos
      const imageUrls: string[] = [];
      const imageCount = req.files.length;
      
      for (let i = 0; i < imageCount; i++) {
        const file = req.files[i];
        // Se for múltiplos arquivos, adicionar índice ao nome para manter SEO mas único
        const currentFileName = fileName ? `${fileName}-${i + 1}` : undefined;
        const imageUrl = await uploadService.uploadImage(file, folder, currentFileName);
        imageUrls.push(imageUrl);
      }
      req.body.imageUrls = imageUrls;
    }
    next();
  } catch (error) {
    next(error);
  }
};
