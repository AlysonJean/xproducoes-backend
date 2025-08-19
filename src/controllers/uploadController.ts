
import { Request, Response, NextFunction } from "express";
import { UploadService } from "../services/uploadService";

export class UploadController {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Utilizador não autenticado." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado." });
      }

      const avatarUrl = await this.uploadService.uploadAvatar(
        req.userId,
        req.file,
      );

      return res.status(200).json({
        message: "Avatar carregado com sucesso.",
        avatarUrl,
      });
    } catch (error) {
      return next(error);
    }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      return next(error);
    }
  };
}
