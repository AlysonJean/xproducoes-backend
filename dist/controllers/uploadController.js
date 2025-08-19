"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const uploadService_1 = require("../services/uploadService");
class UploadController {
    constructor() {
        this.uploadAvatar = async (req, res, next) => {
            try {
                if (!req.userId) {
                    return res.status(401).json({ message: "Utilizador não autenticado." });
                }
                if (!req.file) {
                    return res.status(400).json({ message: "Nenhum arquivo foi enviado." });
                }
                const avatarUrl = await this.uploadService.uploadAvatar(req.userId, req.file);
                return res.status(200).json({
                    message: "Avatar carregado com sucesso.",
                    avatarUrl,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.uploadImage = async (req, res, next) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ message: "Nenhum arquivo foi enviado." });
                }
                const { folder } = req.body;
                const imageUrl = await this.uploadService.uploadImage(req.file, folder);
                return res.status(200).json({
                    message: "Imagem carregada com sucesso.",
                    imageUrl,
                });
            }
            catch (error) {
                return next(error);
            }
        };
        this.uploadService = new uploadService_1.UploadService();
    }
}
exports.UploadController = UploadController;
