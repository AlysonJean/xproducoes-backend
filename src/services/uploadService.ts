import multer from "multer";
import cloudinary from "../config/cloudinary";

export class UploadService {
  
  // Configuração sempre para Cloudinary (memória)
  getCloudinaryMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      fileFilter: this.imageFilter,
      limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
      }
    });
  }

  private imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log('[ImageFilter] Checking file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    const isValidImage = file.mimetype.startsWith("image/") || 
                        file.originalname.toLowerCase().endsWith('.svg') ||
                        file.mimetype === 'text/xml' ||
                        file.mimetype === 'application/xml' ||
                        file.mimetype === 'application/svg+xml';
    
    console.log('[ImageFilter] File validation result:', {
      isValidImage,
      mimetype: file.mimetype,
      originalname: file.originalname
    });
    
    if (isValidImage) {
      cb(null, true);
    } else {
      console.error('[ImageFilter] File rejected:', file.mimetype);
      cb(new Error("Apenas arquivos de imagem são permitidos (PNG, JPEG, SVG)"));
    }
  };

  // Upload sempre para Cloudinary
  async uploadImage(file: Express.Multer.File, folder: string = "portfolio"): Promise<string> {
    return this.uploadToCloudinary(file, folder);
  }

  // Upload para Cloudinary (sempre)
  private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const isSvg =
        file.mimetype === 'image/svg+xml' ||
        (file.originalname && file.originalname.toLowerCase().endsWith('.svg'));

      console.log('[UploadService] File info:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        isSvg: isSvg
      });

      // Base options
      const baseOptions: any = {
        folder: `x-producoes/${folder}`,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };

      // Para SVG: não aplicar transformações que forcem rasterização ou conversão
      const svgOptions: any = {
        ...baseOptions,
        format: 'svg', // garante extensão/entrega como SVG
        // Sem 'fetch_format', 'quality' ou 'resize'
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

      // Prepare buffer for upload; sanitize SVGs synchronously before creating stream
      let bufferToSend = file.buffer;
      if (isSvg) {
        console.log('[UploadService] Processing SVG file');
        try {
          // dynamic import but executed before upload stream and using promise chain
          const jsdomMod = require('jsdom');
          const dompurifyMod = require('dompurify');
          const JSDOM = jsdomMod.JSDOM;
          const createDOMPurify = dompurifyMod.default || dompurifyMod;
          const window = new JSDOM('').window;
          const DOMPurify = createDOMPurify(window);
          const svgText = file.buffer.toString('utf8');
          console.log('[UploadService] Original SVG length:', svgText.length);
          const clean = DOMPurify.sanitize(svgText, { USE_PROFILES: { svg: true } });
          console.log('[UploadService] Sanitized SVG length:', clean.length);
          bufferToSend = Buffer.from(clean, 'utf8');
        } catch (sanErr) {
          console.error('[UploadService] SVG sanitization failed:', sanErr);
          reject(new Error('SVG sanitization failed'));
          return;
        }
      }

      console.log('[UploadService] Starting Cloudinary upload with options:', isSvg ? svgOptions : rasterOptions);

      const uploadStream = cloudinary.uploader.upload_stream(
        isSvg ? svgOptions : rasterOptions,
        (error: any, result: any) => {
          if (error) {
            // Log detalhado do erro do Cloudinary para diagnóstico
            // Não loga buffer nem secrets
            console.error('[Cloudinary] Upload error:', {
              name: error?.name,
              message: error?.message,
              http_code: error?.http_code,
            });
            const message = error?.message || 'Erro no upload da imagem';
            reject(new Error(message));
            return;
          }
          if (!result?.secure_url) {
            console.error('[Cloudinary] Upload sem secure_url no resultado');
            reject(new Error('Falha ao obter URL segura do Cloudinary'));
            return;
          }
          console.log('[UploadService] Upload successful:', result.secure_url);
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
        (error: any, result: any) => {
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
