import { Request, Response, NextFunction } from 'express';
import multer from "multer";
import { UploadService } from '../services/uploadService';
import logger from "../config/logger";
import { contentMatchesMimetype } from "../utils/fileSignature";


const uploadService = new UploadService();

function extractMessage(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return undefined;
}

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
    
    middleware(req, res, (err: unknown) => {
      if (err) {
        logger.error({obj:{
          name: err instanceof Error ? err.name : undefined,
          message: extractMessage(err),
          code: err instanceof multer.MulterError ? err.code : undefined
        }}, '[UploadMiddleware] Multer error:');

        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            // Alinhado ao limite real configurado em uploadService.getCloudinaryMulterConfig
            // (50MB) — a mensagem dizia 5MB, o que não correspondia ao limite
            // de fato aplicado pelo multer.
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 50MB.' });
          }
          return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        }

        // Erro de validação de tipo de arquivo
        return res.status(400).json({ error: extractMessage(err) || 'Tipo de arquivo não permitido.' });
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
      // O mimetype vem do Content-Type enviado pelo cliente — forjável. Confere
      // a assinatura binária real antes de aceitar (o buffer só existe aqui,
      // depois que o multer termina de processar — não dá para checar isso
      // dentro do fileFilter, o buffer ainda não existe nesse ponto).
      if (!contentMatchesMimetype(req.file.buffer, req.file.mimetype, req.file.originalname)) {
        logger.warn({obj: { mimetype: req.file.mimetype, originalname: req.file.originalname }}, '[UploadMiddleware] Conteúdo do arquivo não bate com o mimetype declarado');
        return res.status(400).json({ error: 'O conteúdo do arquivo não corresponde ao tipo declarado.' });
      }

      // Upload de arquivo único
      const url = await uploadService.uploadFile(req.file, folder, fileName);
      req.body.imageUrl = url;
      req.body.uploadedFile = {
        url,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    } else if (req.files && Array.isArray(req.files)) {
      // Upload de múltiplos arquivos
      const imageUrls: string[] = [];
      const uploadedFiles: Array<{ url: string; filename: string; mimetype: string; size: number }> = [];
      const fileCount = req.files.length;

      for (let i = 0; i < fileCount; i++) {
        const file = req.files[i];

        if (!contentMatchesMimetype(file.buffer, file.mimetype, file.originalname)) {
          logger.warn({obj: { mimetype: file.mimetype, originalname: file.originalname }}, '[UploadMiddleware] Conteúdo do arquivo não bate com o mimetype declarado');
          return res.status(400).json({ error: `O conteúdo do arquivo "${file.originalname}" não corresponde ao tipo declarado.` });
        }

        // Se for múltiplos arquivos, adicionar índice ao nome para manter SEO mas único
        const currentFileName = fileName ? `${fileName}-${i + 1}` : undefined;
        const url = await uploadService.uploadFile(file, folder, currentFileName);

        imageUrls.push(url);
        uploadedFiles.push({
          url,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
      }
      req.body.imageUrls = imageUrls;
      req.body.uploadedFiles = uploadedFiles;
    }
    next();
  } catch (error) {
    next(error);
  }
};
