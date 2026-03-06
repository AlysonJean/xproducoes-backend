import { createSafeRouter } from "../middlewares/safeRouter";
import { UploadController } from "../controllers/uploadController";
import { uploadSingle, processUpload } from "../middlewares/upload";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware';
import { authenticate } from "../middlewares/unifiedAuth";

const uploadRoutes = createSafeRouter();
const uploadController = new UploadController();


// Rota para upload de avatar
uploadRoutes.post(
  "/avatar",
  authenticate,
  uploadRateLimit, uploadSingle("avatar"),
  processUpload,
  uploadController.uploadAvatar,
);

// Rota para upload de imagem genérica
uploadRoutes.post(
  "/image",
  authenticate,
  uploadRateLimit, uploadSingle("image"),
  processUpload,
  uploadController.uploadImage,
);

export default uploadRoutes;
