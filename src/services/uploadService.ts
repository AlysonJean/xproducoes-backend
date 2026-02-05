import multer from "multer";
import cloudinary from "../config/cloudinary";
import logger from "../config/logger";
import type { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import type { Request } from "express";


export class UploadService {
  
  // Configuração sempre para Cloudinary (memória)
  getCloudinaryMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      fileFilter: this.mediaFilter,
      limits: { 
        fileSize: 50 * 1024 * 1024, // 50MB for videos
        files: 10 // Allow more files
      }
    });
  }

  private mediaFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    logger.info({obj:{
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }}, '[MediaFilter] Checking file:');
    
    // Allow images and videos
    const isImage = file.mimetype.startsWith("image/") || 
                    file.originalname.toLowerCase().endsWith('.svg') ||
                    file.mimetype === 'text/xml' || // legacy svg support
                    file.mimetype === 'application/xml' ||
                    file.mimetype === 'application/svg+xml';
    
    const isVideo = file.mimetype.startsWith("video/");

    const isValid = isImage || isVideo;
    
    logger.info({obj:{
      isValid,
      isImage,
      isVideo,
      mimetype: file.mimetype,
      originalname: file.originalname
    }}, '[MediaFilter] File validation result:');
    
    if (isValid) {
      cb(null, true);
    } else {
      logger.error({obj:file.mimetype}, '[MediaFilter] File rejected:');
      cb(new Error("Apenas arquivos de imagem e vídeo são permitidos"));
    }
  };

  // Upload sempre para Cloudinary
  async uploadFile(file: Express.Multer.File, folder: string = "portfolio", fileName?: string): Promise<string> {
    return this.uploadToCloudinary(file, folder, fileName);
  }

  // Deprecated alias
  async uploadImage(file: Express.Multer.File, folder: string = "portfolio", fileName?: string): Promise<string> {
    return this.uploadFile(file, folder, fileName);
  }

  // Upload para Cloudinary (sempre)
  private async uploadToCloudinary(file: Express.Multer.File, folder: string, fileName?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const isSvg =
        file.mimetype === 'image/svg+xml' ||
        (file.originalname && file.originalname.toLowerCase().endsWith('.svg'));
      
      const isVideo = file.mimetype.startsWith("video/");

      logger.info({obj:{
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        isSvg: isSvg,
        isVideo: isVideo
      }}, '[UploadService] File info:');

      // Base options
      const baseOptions: any = {
        folder: `x-producoes/${folder}`,
        resource_type: 'auto', // Auto-detect image or video
        use_filename: true,
        unique_filename: !fileName,
        overwrite: true,
        ...(fileName ? { public_id: fileName } : {}),
      };

      // Para SVG: não aplicar transformações que forcem rasterização ou conversão
      const svgOptions: any = {
        ...baseOptions,
        format: 'svg',
      };

      // Para imagens raster: aplicar otimizações seguras
      const rasterOptions: any = {
        ...baseOptions,
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      };

      // Para vídeos
      const videoOptions: any = {
        ...baseOptions,
        resource_type: 'video',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      };

      let optionsToUse = baseOptions;
      if (isSvg) optionsToUse = svgOptions;
      else if (isVideo) optionsToUse = videoOptions;
      else optionsToUse = rasterOptions;

      // Prepare buffer for upload; sanitize SVGs synchronously before creating stream
      let bufferToSend = file.buffer;
      if (isSvg) {
        logger.info('[UploadService] Processing SVG file');
        try {
          const jsdomMod = require('jsdom');
          const dompurifyMod = require('dompurify');
          const JSDOM = jsdomMod.JSDOM;
          const createDOMPurify = dompurifyMod.default || dompurifyMod;
          const window = new JSDOM('').window;
          const DOMPurify = createDOMPurify(window);
          const svgText = file.buffer.toString('utf8');
          logger.info({obj:svgText.length}, '[UploadService] Original SVG length:');
          const clean = DOMPurify.sanitize(svgText, { USE_PROFILES: { svg: true } });
          logger.info({obj:clean.length}, '[UploadService] Sanitized SVG length:');
          bufferToSend = Buffer.from(clean, 'utf8');
        } catch (sanErr) {
          logger.error({obj:sanErr}, '[UploadService] SVG sanitization failed:');
          reject(new Error('SVG sanitization failed'));
          return;
        }
      }

      logger.info({obj:optionsToUse}, '[UploadService] Starting Cloudinary upload with options:');

      const uploadStream = cloudinary.uploader.upload_stream(
        optionsToUse,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            // Log detalhado do erro do Cloudinary para diagnóstico
            // Não loga buffer nem secrets
            logger.error({obj:{
              name: error?.name,
              message: error?.message,
              http_code: error?.http_code,
            }}, '[Cloudinary] Upload error:');
            const message = error?.message || 'Erro no upload do arquivo';
            reject(new Error(message));
            return;
          }
          if (!result?.secure_url) {
            logger.error('[Cloudinary] Upload sem secure_url no resultado');
            reject(new Error('Falha ao obter URL segura do Cloudinary'));
            return;
          }
          logger.info({obj:result.secure_url}, '[UploadService] Upload successful:');
          resolve(result.secure_url);
        },
      );

      uploadStream.end(bufferToSend);
    });
  }

  // Upload de avatar sempre para Cloudinary
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "x-producoes/avatars",
          public_id: `avatar_${userId}`,
          transformation: [
            { width: 300, height: 300, crop: "fill", gravity: "face" },
            { quality: "auto" },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new Error("Erro no upload do avatar"));
            return;
          }
          resolve(result?.secure_url || "");
        },
      );
      uploadStream.end(file.buffer);
    });
  }
}
