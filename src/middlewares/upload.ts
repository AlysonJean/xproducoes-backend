import { Request, Response, NextFunction } from 'express';
import multer from "multer";
import { UploadService } from '../services/uploadService';

const uploadService = new UploadService();

// Middleware para upload de uma única imagem
export const uploadSingle = (fieldName: string = 'image') => {
  // Sempre usar Cloudinary
  const multerConfig = uploadService.getCloudinaryMulterConfig();
  
  const middleware = multerConfig.single(fieldName);
  
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`[UploadMiddleware] Processing ${fieldName} upload`);
    console.log('[UploadMiddleware] Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    
    middleware(req, res, (err: any) => {
      if (err) {
        console.error('[UploadMiddleware] Multer error:', {
          name: err.name,
          message: err.message,
          code: err.code
        });
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 5MB.' });
          }
          return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        }
        
        // Erro de validação de tipo de arquivo
        return res.status(400).json({ error: err.message || 'Tipo de arquivo não permitido.' });
      }
      
      console.log('[UploadMiddleware] File processed successfully:', {
        fieldname: req.file?.fieldname,
        originalname: req.file?.originalname,
        mimetype: req.file?.mimetype,
        size: req.file?.size
      });
      
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
    if (req.file) {
      // Upload de arquivo único
      const imageUrl = await uploadService.uploadImage(req.file);
      req.body.imageUrl = imageUrl;
    } else if (req.files && Array.isArray(req.files)) {
      // Upload de múltiplos arquivos
      const imageUrls: string[] = [];
      for (const file of req.files) {
        const imageUrl = await uploadService.uploadImage(file);
        imageUrls.push(imageUrl);
      }
      req.body.imageUrls = imageUrls;
    }
    next();
  } catch (error) {
    next(error);
  }
};
