"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLogo = void 0;
const uploadService_1 = require("../services/uploadService");
const uploadService = new uploadService_1.UploadService();
const uploadLogo = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        // Upload para Cloudinary
        const logoUrl = await uploadService.uploadImage(req.file, 'logo');
        if (!logoUrl) {
            return res.status(500).json({ error: 'Falha ao obter URL do logo após upload.' });
        }
        return res.status(200).json({ logoUrl });
    }
    catch (error) {
        console.error('[LogoController] Erro ao enviar logo:', {
            message: error?.message,
            name: error?.name,
        });
        return res.status(500).json({ error: error?.message || 'Erro ao enviar logo.' });
    }
};
exports.uploadLogo = uploadLogo;
