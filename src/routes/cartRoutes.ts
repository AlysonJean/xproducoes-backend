import { createSafeRouter } from "../middlewares/safeRouter";
import { CartController } from "../controllers/cartController";
import { authenticate } from "../middlewares/unifiedAuth";
import { cartRateLimit } from "../middlewares/rateLimitMiddleware";

const cartRoutes = createSafeRouter();
const cartController = new CartController();

cartRoutes.use(authenticate);
cartRoutes.use(cartRateLimit);

cartRoutes.get("/", cartController.getCart);
cartRoutes.post("/add", cartController.addItem);
cartRoutes.post("/add-service", cartController.addService);
cartRoutes.post("/add-kit", cartController.addKit);
cartRoutes.post("/checkout", cartController.checkout);
cartRoutes.delete("/remove/:equipmentId", cartController.removeItem);
cartRoutes.delete("/remove-service/:serviceId", cartController.removeService);
cartRoutes.delete("/remove-kit/:kitId", cartController.removeKit);
cartRoutes.post("/clear", cartController.clearCart);

export default cartRoutes;
