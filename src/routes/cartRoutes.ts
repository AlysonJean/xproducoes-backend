import { Router, type Router as RouterType } from "express";
import { CartController } from "../controllers/cartController";
import { authMiddleware } from "../middlewares/authMiddleware";

const cartRoutes: RouterType = Router();
const cartController = new CartController();

cartRoutes.use(authMiddleware);

cartRoutes.get("/", cartController.getCart);
cartRoutes.post("/add", cartController.addItem);
cartRoutes.post("/add-kit", cartController.addKit);
cartRoutes.post("/checkout", cartController.checkout);
cartRoutes.delete("/remove/:equipmentId", cartController.removeItem);
cartRoutes.post("/clear-equipments", cartController.clearEquipments);
cartRoutes.post("/clear-kit", cartController.clearKit);
cartRoutes.post("/clear", cartController.clearCart);

export default cartRoutes;
