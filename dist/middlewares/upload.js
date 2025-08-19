"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUpload = exports.uploadAvatar = exports.uploadMultiple = exports.uploadSingle = void 0;
const uploadService_1 = require("../services/uploadService");
const uploadService = new uploadService_1.UploadService();
// Middleware para upload de uma única imagem
const uploadSingle = (fieldName = 'image') => {
    // Sempre usar Cloudinary
    const multerConfig = uploadService.getCloudinaryMulterConfig();
    return multerConfig.single(fieldName);
};
exports.uploadSingle = uploadSingle;
// Middleware para upload de múltiplas imagens
const uploadMultiple = (fieldName = 'images', maxFiles = 5) => {
    // Sempre usar Cloudinary
    const multerConfig = uploadService.getCloudinaryMulterConfig();
    return multerConfig.array(fieldName, maxFiles);
};
exports.uploadMultiple = uploadMultiple;
// Middleware para upload de avatar
exports.uploadAvatar = (0, exports.uploadSingle)('avatar');
// Middleware para processamento após upload
const processUpload = async (req, res, next) => {
    try {
        if (req.file) {
            // Upload de arquivo único
            const imageUrl = await uploadService.uploadImage(req.file);
            req.body.imageUrl = imageUrl;
        }
        else if (req.files && Array.isArray(req.files)) {
            // Upload de múltiplos arquivos
            const imageUrls = [];
            for (const file of req.files) {
                const imageUrl = await uploadService.uploadImage(file);
                imageUrls.push(imageUrl);
            }
            req.body.imageUrls = imageUrls;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.processUpload = processUpload;
