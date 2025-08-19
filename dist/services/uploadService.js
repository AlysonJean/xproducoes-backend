"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
class UploadService {
    constructor() {
        this.imageFilter = (req, file, cb) => {
            if (file.mimetype.startsWith("image/")) {
                cb(null, true);
            }
            else {
                cb(new Error("Apenas arquivos de imagem são permitidos"));
            }
        };
    }
    // Configuração sempre para Cloudinary (memória)
    getCloudinaryMulterConfig() {
        return (0, multer_1.default)({
            storage: multer_1.default.memoryStorage(),
            fileFilter: this.imageFilter,
            limits: { fileSize: 5 * 1024 * 1024 } // 5MB
        });
    }
    // Upload sempre para Cloudinary
    async uploadImage(file, folder = "portfolio") {
        return this.uploadToCloudinary(file, folder);
    }
    // Upload para Cloudinary (sempre)
    async uploadToCloudinary(file, folder) {
        return new Promise((resolve, reject) => {
            const isSvg = file.mimetype === 'image/svg+xml' ||
                (file.originalname && file.originalname.toLowerCase().endsWith('.svg'));
            // Base options
            const baseOptions = {
                folder: `x-producoes/${folder}`,
                resource_type: 'image',
                use_filename: true,
                unique_filename: false,
                overwrite: true,
            };
            // Para SVG: não aplicar transformações que forcem rasterização ou conversão
            const svgOptions = {
                ...baseOptions,
                format: 'svg', // garante extensão/entrega como SVG
                // Sem 'fetch_format', 'quality' ou 'resize'
            };
            // Para imagens raster: aplicar otimizações seguras
            const rasterOptions = {
                ...baseOptions,
                transformation: [
                    { width: 1200, height: 1200, crop: 'limit' },
                    { quality: 'auto' },
                    { fetch_format: 'auto' },
                ],
            };
            const uploadStream = cloudinary_1.default.uploader.upload_stream(isSvg ? svgOptions : rasterOptions, (error, result) => {
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
                resolve(result.secure_url);
            });
            uploadStream.end(file.buffer);
        });
    }
    // Upload de avatar sempre para Cloudinary
    async uploadAvatar(userId, file) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.default.uploader.upload_stream({
                folder: "x-producoes/avatars",
                public_id: `avatar_${userId}`,
                transformation: [
                    { width: 300, height: 300, crop: "fill", gravity: "face" },
                    { quality: "auto" },
                ],
            }, (error, result) => {
                if (error) {
                    reject(new Error("Erro no upload do avatar"));
                    return;
                }
                resolve(result?.secure_url || "");
            });
            uploadStream.end(file.buffer);
        });
    }
}
exports.UploadService = UploadService;
