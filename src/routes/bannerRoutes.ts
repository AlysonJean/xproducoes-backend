
import { Router } from "express";
import { BannerController } from "../controllers/bannerController";
import { authenticate, requireAdmin } from "../middlewares/unifiedAuth";

const router = Router();
const controller = new BannerController();

// Rotas Públicas
router.get("/public", controller.getPublicBanners);

// Rotas de Admin
router.get("/", authenticate, requireAdmin, controller.getAllBanners);
router.post("/", authenticate, requireAdmin, controller.createBanner);
router.put("/:id", authenticate, requireAdmin, controller.updateBanner);
router.delete("/:id", authenticate, requireAdmin, controller.deleteBanner);

export default router;
