import { createSafeRouter } from "../middlewares/safeRouter.js";
import { UploadController } from "../controllers/uploadController.js";
import { uploadSingle, processUpload } from "../middlewares/upload.js";
import { uploadRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { authenticate } from "../middlewares/unifiedAuth.js";

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
