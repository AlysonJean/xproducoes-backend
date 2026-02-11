import { createSafeRouter } from "../middlewares/safeRouter";
import { UploadController } from "../controllers/uploadController";
import { uploadSingle } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';
import { authenticate } from "../middlewares/unifiedAuth";

const uploadRoutes = createSafeRouter();
const uploadController = new UploadController();


// Rota para upload de avatar
uploadRoutes.post(
  "/avatar",
  authenticate,
  uploadRateLimit, uploadSingle("avatar"),
  require("../middlewares/upload").processUpload,
  uploadController.uploadAvatar,
);

// Rota para upload de imagem genérica
uploadRoutes.post(
  "/image",
  authenticate,
  uploadRateLimit, uploadSingle("image"),
  require("../middlewares/upload").processUpload,
  uploadController.uploadImage,
);

export default uploadRoutes;
