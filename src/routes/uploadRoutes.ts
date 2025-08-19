import { Router, type Router as RouterType } from "express";
import { UploadController } from "../controllers/uploadController";
import { uploadSingle } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/authMiddleware";

const uploadRoutes: Router = Router();
const uploadController = new UploadController();


// Rota para upload de avatar
uploadRoutes.post(
  "/avatar",
  authMiddleware,
  uploadSingle("avatar"),
  require("../middlewares/upload").processUpload,
  uploadController.uploadAvatar,
);

// Rota para upload de imagem genérica
uploadRoutes.post(
  "/image",
  authMiddleware,
  uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  uploadController.uploadImage,
);

export default uploadRoutes;
