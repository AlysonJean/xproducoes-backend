import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/uploadService';

const uploadService = new UploadService();

// Middleware para upload de uma única imagem
export const uploadSingle = (fieldName: string = 'image') => {
  // Sempre usar Cloudinary
  const multerConfig = uploadService.getCloudinaryMulterConfig();
  
  return multerConfig.single(fieldName);
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
